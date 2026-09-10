//! iroh-bridge — транспортный сайдкар для AlterSend.
//!
//! Поднимает iroh Endpoint и мостит каждый QUIC bi-stream в отдельное локальное
//! TCP-соединение, чтобы JS-сторона (Bare worklet / Electron main) могла говорить
//! своим протоколом, не умея Node-API.
//!
//! Протокол моста (TCP, 127.0.0.1), первая строка от клиента — JSON:
//!   {"op":"control"}                        — канал событий
//!   {"op":"join","topic":hex,"role":"host"} — начать хостить код
//!   {"op":"join","topic":hex,"role":"guest"}— подключиться к коду
//!   {"op":"leave"}                          — закрыть Endpoint
//!   {"op":"open"}                           — открыть новый bi-stream к пиру
//!   {"op":"attach","id":N}                  — принять входящий bi-stream N
//! Сервер отвечает одной строкой {"ok":true,...}, дальше — сырой поток.

use std::collections::HashMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

use anyhow::{Context, Result, anyhow};
use iroh::endpoint::{Connection, RecvStream, SendStream, presets};
use iroh::{Endpoint, EndpointAddr, RelayMode, SecretKey, TransportAddr};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{Mutex, broadcast, watch};

const ALPN: &[u8] = b"altersend/drive/1";
const BINDING_LABEL: &[u8] = b"altersend/channel-binding";

struct Args {
    bridge_port: u16,
    offline: bool,
    mdns: bool,
}

fn parse_args() -> Result<Args> {
    let mut a = Args { bridge_port: 0, offline: false, mdns: false };
    let argv: Vec<String> = std::env::args().skip(1).collect();
    let mut i = 0;
    while i < argv.len() {
        match argv[i].as_str() {
            "--bridge-port" => {
                a.bridge_port = argv[i + 1].parse()?;
                i += 2;
            }
            "--offline" => {
                a.offline = true;
                i += 1;
            }
            "--mdns" => {
                a.mdns = true;
                i += 1;
            }
            other => return Err(anyhow!("unknown arg {other}")),
        }
    }
    Ok(a)
}

fn hex_to_key(s: &str) -> Result<SecretKey> {
    if s.len() != 64 {
        return Err(anyhow!("topic must be 32 bytes hex"));
    }
    let raw = (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16))
        .collect::<Result<Vec<u8>, _>>()?;
    let arr: [u8; 32] = raw.as_slice().try_into().map_err(|_| anyhow!("bad topic"))?;
    Ok(SecretKey::from_bytes(&arr))
}

fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

type Pending = Arc<Mutex<HashMap<u64, (SendStream, RecvStream)>>>;

/// Живой Endpoint с единственным соединением. Пересоздаётся на каждый join.
struct Node {
    endpoint: Endpoint,
    conn_rx: watch::Receiver<Option<Connection>>,
    pending: Pending,
}

type Shared = Arc<Mutex<Option<Node>>>;

#[tokio::main]
async fn main() -> Result<()> {
    let args = parse_args()?;
    let (events_tx, _) = broadcast::channel::<String>(256);
    let node: Shared = Arc::new(Mutex::new(None));

    let bridge = TcpListener::bind(("127.0.0.1", args.bridge_port)).await?;
    let bridge_port = bridge.local_addr()?.port();

    println!(
        "{}",
        serde_json::json!({
            "ready": true,
            "bridgePort": bridge_port,
            "offline": args.offline,
            "mdns": args.mdns,
        })
    );

    let cfg = Arc::new(args);
    loop {
        let (sock, _) = bridge.accept().await?;
        let events_tx = events_tx.clone();
        let node = node.clone();
        let cfg = cfg.clone();
        tokio::spawn(async move {
            if let Err(e) = handle_bridge(sock, events_tx, node, cfg).await {
                eprintln!("bridge conn error: {e:#}");
            }
        });
    }
}

async fn build_endpoint(cfg: &Args, secret: SecretKey) -> Result<Endpoint> {
    // Оффлайн: ни релея, ни DNS/pkarr — только прямой UDP и, если попросили, mDNS.
    let endpoint = if cfg.offline {
        let mut b = Endpoint::builder(presets::Minimal)
            .secret_key(secret)
            .alpns(vec![ALPN.to_vec()])
            .relay_mode(RelayMode::Disabled);
        if cfg.mdns {
            b = b.address_lookup(iroh_mdns_address_lookup::MdnsAddressLookup::builder());
        }
        b.bind().await?
    } else {
        let mut b = Endpoint::builder(presets::N0)
            .secret_key(secret)
            .alpns(vec![ALPN.to_vec()]);
        if cfg.mdns {
            b = b.address_lookup(iroh_mdns_address_lookup::MdnsAddressLookup::builder());
        }
        b.bind().await?
    };
    Ok(endpoint)
}

async fn local_addrs(endpoint: &Endpoint) -> Vec<String> {
    for _ in 0..60 {
        let addr: EndpointAddr = endpoint.addr();
        let ips: Vec<String> = addr
            .addrs
            .iter()
            .filter_map(|a| match a {
                TransportAddr::Ip(sa) => Some(sa.to_string()),
                _ => None,
            })
            .collect();
        if !ips.is_empty() {
            return ips;
        }
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
    endpoint.bound_sockets().iter().map(|s| s.to_string()).collect()
}

fn channel_binding(conn: &Connection) -> Option<String> {
    let mut out = [0u8; 32];
    conn.export_keying_material(&mut out, BINDING_LABEL, &[]).ok()?;
    Some(to_hex(&out))
}

fn announce_peer(events: &broadcast::Sender<String>, conn: &Connection, direction: &str) {
    let _ = events.send(
        serde_json::json!({
            "event": "peer",
            "direction": direction,
            "endpointId": conn.remote_id().to_string(),
            "binding": channel_binding(conn),
        })
        .to_string(),
    );
}

/// Принимать входящие bi-stream'ы и складывать до `attach`.
fn spawn_stream_acceptor(
    mut conn_rx: watch::Receiver<Option<Connection>>,
    pending: Pending,
    events: broadcast::Sender<String>,
) {
    let next_id = Arc::new(AtomicU64::new(1));
    tokio::spawn(async move {
        let conn = loop {
            if let Some(c) = conn_rx.borrow_and_update().clone() {
                break c;
            }
            if conn_rx.changed().await.is_err() {
                return;
            }
        };
        loop {
            match conn.accept_bi().await {
                Ok((send, recv)) => {
                    let id = next_id.fetch_add(1, Ordering::Relaxed);
                    pending.lock().await.insert(id, (send, recv));
                    let _ = events.send(serde_json::json!({"event":"stream","id":id}).to_string());
                }
                Err(e) => {
                    let _ = events.send(
                        serde_json::json!({"event":"closed","message": e.to_string()}).to_string(),
                    );
                    return;
                }
            }
        }
    });
}

async fn join(
    cfg: &Args,
    node: &Shared,
    events: &broadcast::Sender<String>,
    topic: &str,
    role: &str,
    hints: Vec<std::net::SocketAddr>,
) -> Result<serde_json::Value> {
    leave(node).await;

    // ВНИМАНИЕ: join-код здесь напрямую становится секретным ключом хоста, поэтому
    // гость выводит EndpointId из кода без всякого обмена. Для продакшена так нельзя —
    // владелец кода может представиться хостом. Нужен HKDF от кода и topic-auth.
    let host_secret = hex_to_key(topic)?;
    let host_id = host_secret.public();

    let secret = if role == "host" { host_secret } else { SecretKey::generate() };
    let endpoint = build_endpoint(cfg, secret).await?;
    let addrs = local_addrs(&endpoint).await;

    let (conn_tx, conn_rx) = watch::channel::<Option<Connection>>(None);
    let pending: Pending = Arc::new(Mutex::new(HashMap::new()));
    spawn_stream_acceptor(conn_rx.clone(), pending.clone(), events.clone());

    if role == "host" {
        let ep = endpoint.clone();
        let events = events.clone();
        tokio::spawn(async move {
            while let Some(incoming) = ep.accept().await {
                match incoming.await {
                    Ok(conn) => {
                        announce_peer(&events, &conn, "in");
                        let _ = conn_tx.send(Some(conn));
                    }
                    Err(e) => {
                        let _ = events.send(
                            serde_json::json!({"event":"error","message": e.to_string()})
                                .to_string(),
                        );
                    }
                }
            }
        });
    } else {
        let ep = endpoint.clone();
        let events = events.clone();
        tokio::spawn(async move {
            // Известные адреса — это «запомненное устройство» или узел тейлнета:
            // с ними соединение встаёт за один RTT, без всякого обнаружения.
            let target = if hints.is_empty() {
                EndpointAddr::new(host_id)
            } else {
                EndpointAddr::from_parts(host_id, hints.into_iter().map(TransportAddr::Ip))
            };
            match ep.connect(target, ALPN).await {
                Ok(conn) => {
                    announce_peer(&events, &conn, "out");
                    let _ = conn_tx.send(Some(conn));
                }
                Err(e) => {
                    let _ = events.send(
                        serde_json::json!({"event":"error","message": e.to_string()}).to_string(),
                    );
                }
            }
        });
    }

    let endpoint_id = endpoint.id().to_string();
    *node.lock().await = Some(Node { endpoint, conn_rx, pending });

    Ok(serde_json::json!({ "ok": true, "endpointId": endpoint_id, "addrs": addrs }))
}

async fn leave(node: &Shared) {
    let taken = node.lock().await.take();
    if let Some(n) = taken {
        n.endpoint.close().await;
    }
}

async fn handle_bridge(
    sock: TcpStream,
    events_tx: broadcast::Sender<String>,
    node: Shared,
    cfg: Arc<Args>,
) -> Result<()> {
    sock.set_nodelay(true)?;
    let (r, mut w) = sock.into_split();
    let mut reader = BufReader::new(r);
    let mut line = String::new();
    reader.read_line(&mut line).await?;
    let req: serde_json::Value = serde_json::from_str(line.trim())?;
    let op = req["op"].as_str().unwrap_or("");

    match op {
        "control" => {
            let mut rx = events_tx.subscribe();
            w.write_all(b"{\"ok\":true}\n").await?;
            while let Ok(msg) = rx.recv().await {
                w.write_all(msg.as_bytes()).await?;
                w.write_all(b"\n").await?;
            }
            Ok(())
        }
        "join" => {
            let topic = req["topic"].as_str().context("join needs topic")?;
            let role = req["role"].as_str().unwrap_or("guest");
            let addrs: Vec<std::net::SocketAddr> = req["addrs"]
                .as_array()
                .map(|list| {
                    list.iter()
                        .filter_map(|v| v.as_str())
                        .filter_map(|s| s.parse().ok())
                        .collect()
                })
                .unwrap_or_default();
            let reply = join(&cfg, &node, &events_tx, topic, role, addrs).await?;
            w.write_all(reply.to_string().as_bytes()).await?;
            w.write_all(b"\n").await?;
            Ok(())
        }
        "leave" => {
            leave(&node).await;
            w.write_all(b"{\"ok\":true}\n").await?;
            Ok(())
        }
        "open" => {
            let mut rx = {
                let guard = node.lock().await;
                guard.as_ref().context("open before join")?.conn_rx.clone()
            };
            let conn = loop {
                if let Some(c) = rx.borrow_and_update().clone() {
                    break c;
                }
                rx.changed().await?;
            };
            let (send, recv) = conn.open_bi().await?;
            w.write_all(b"{\"ok\":true}\n").await?;
            pipe(reader, w, send, recv).await
        }
        "attach" => {
            let id = req["id"].as_u64().context("attach needs id")?;
            let pending = {
                let guard = node.lock().await;
                guard.as_ref().context("attach before join")?.pending.clone()
            };
            let (send, recv) = {
                let mut guard = pending.lock().await;
                guard.remove(&id).context("unknown stream id")?
            };
            w.write_all(b"{\"ok\":true}\n").await?;
            pipe(reader, w, send, recv).await
        }
        other => Err(anyhow!("unknown op {other}")),
    }
}

async fn pipe(
    mut tcp_r: BufReader<tokio::net::tcp::OwnedReadHalf>,
    mut tcp_w: tokio::net::tcp::OwnedWriteHalf,
    mut send: SendStream,
    mut recv: RecvStream,
) -> Result<()> {
    let up = async move {
        let n = tokio::io::copy(&mut tcp_r, &mut send).await;
        let _ = send.finish();
        n
    };
    let down = async move {
        let n = tokio::io::copy(&mut recv, &mut tcp_w).await;
        let _ = tcp_w.shutdown().await;
        n
    };
    let (a, b) = tokio::join!(up, down);
    a?;
    b?;
    Ok(())
}
