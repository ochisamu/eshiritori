import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
export class Pairing {
  code = "";
  invite = "";
  expires = 0;
  private attempts = new Map<string, { count: number; since: number }>();
  private devices = new Map<string, { csrf: string; expires: number }>();
  constructor(readonly now = () => Date.now()) {
    this.rotate();
  }
  rotate() {
    this.invite = randomBytes(32).toString("hex");
    this.code = String(randomInt(100000, 1000000));
    this.expires = this.now() + 300000;
    return this.code;
  }
  pair(code: unknown, address: string) {
    const old = this.attempts.get(address);
    const attempt =
      old && this.now() - old.since < 300000
        ? old
        : { count: 0, since: this.now() };
    attempt.count++;
    this.attempts.set(address, attempt);
    if (this.attempts.size > 256)
      this.attempts.delete(this.attempts.keys().next().value!);
    if (attempt.count > 5) throw Error("pair_rate_limit");
    if (
      typeof code !== "string" ||
      !/^\d{6}$/.test(code) ||
      this.now() > this.expires ||
      !timingSafeEqual(Buffer.from(code), Buffer.from(this.code))
    )
      throw Error("invalid_pair_code");
    this.expires = 0;
    return this.issueDevice();
  }
  pairInvite(token: unknown, address: string) {
    // Count invalid links against the same bounded attempt window as legacy pairing.
    const valid =
      typeof token === "string" &&
      /^[a-f0-9]{64}$/.test(token) &&
      timingSafeEqual(Buffer.from(token), Buffer.from(this.invite));
    return this.pair(valid ? this.code : "", address);
  }
  issueDevice() {
    const id = randomBytes(32).toString("hex"),
      csrf = randomBytes(24).toString("hex");
    this.devices.set(id, { csrf, expires: this.now() + 3600000 });
    for (const [key, value] of this.devices)
      if (value.expires < this.now()) this.devices.delete(key);
    return { id, csrf };
  }
  device(cookie: string | undefined) {
    const id = cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("eshiritori_voice="))
      ?.slice("eshiritori_voice=".length);
    const device = id && this.devices.get(id);
    return device && device.expires > this.now()
      ? { id, ...device }
      : undefined;
  }
}
