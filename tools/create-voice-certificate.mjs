import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync, chmodSync } from "node:fs";
import { resolve, join } from "node:path";
import { isIP } from "node:net";
const hosts = process.argv.slice(2);
if (
  !hosts.length ||
  hosts.some(
    (host) =>
      !isIP(host) &&
      !/^([a-zA-Z0-9][a-zA-Z0-9-]*[.])*[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(host),
  )
)
  throw Error(
    "Usage: node tools/create-voice-certificate.mjs <LAN IP> [hostname]",
  );
const root = resolve(".voice/certificates");
mkdirSync(root, { recursive: true, mode: 0o700 });
const caKey = join(root, "local-ca.key"),
  ca = join(root, "local-ca.crt"),
  key = join(root, "server.key"),
  cert = join(root, "server.crt");
if ([caKey, ca, key, cert].some(existsSync))
  throw Error(
    "Certificate files already exist. Keep them or choose a separate workspace; nothing overwritten.",
  );
function run(args) {
  const result = spawnSync("openssl", args, {
    stdio: ["ignore", "ignore", "pipe"],
  });
  if (result.status !== 0)
    throw Error(
      "OpenSSL failed. Install OpenSSL and check writable certificate directory.",
    );
}
run(["genrsa", "-out", caKey, "3072"]);
run([
  "req",
  "-x509",
  "-new",
  "-key",
  caKey,
  "-sha256",
  "-days",
  "365",
  "-out",
  ca,
  "-subj",
  "/CN=Eshiritori Local Voice CA",
]);
run(["genrsa", "-out", key, "2048"]);
const ext = join(root, "server.ext");
writeFileSync(
  ext,
  "subjectAltName=" +
    [...new Set([...hosts, "localhost", "127.0.0.1"])]
      .map((host) => (isIP(host) ? "IP:" : "DNS:") + host)
      .join(",") +
    "\nextendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE\n",
);
const csr = join(root, "server.csr");
run(["req", "-new", "-key", key, "-out", csr, "-subj", "/CN=" + hosts[0]]);
run([
  "x509",
  "-req",
  "-in",
  csr,
  "-CA",
  ca,
  "-CAkey",
  caKey,
  "-CAcreateserial",
  "-out",
  cert,
  "-days",
  "90",
  "-sha256",
  "-extfile",
  ext,
]);
chmodSync(caKey, 0o600);
chmodSync(key, 0o600);
console.log("Created local CA and SAN certificate under .voice/certificates.");
console.log(
  "No OS trust or firewall settings were changed. Transfer only local-ca.crt for intentional trust installation.",
);
