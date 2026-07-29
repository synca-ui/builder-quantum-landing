import { describe, it, expect } from "vitest";
import { isBlockedAddress, assertUrlAllowed, SafeFetchError } from "../services/safeFetch";

/**
 * Diese Prüfungen stehen zwischen einer fremden Website und unserem internen
 * Netz. Auf Railway liegen dort die Datenbank und der Supabase-Service-Key;
 * eine Lücke hier gibt beides heraus.
 *
 * Nur die netzfreien Teile werden hier geprüft (Adressbewertung und Vorabprüfung).
 * Der Download selbst braucht einen echten Server und gehört nicht in einen
 * Unit-Test.
 */

describe("isBlockedAddress", () => {
  it("sperrt Loopback", () => {
    expect(isBlockedAddress("127.0.0.1")).toBe(true);
    expect(isBlockedAddress("127.255.255.254")).toBe(true);
    expect(isBlockedAddress("::1")).toBe(true);
  });

  it("sperrt den Metadaten-Dienst der Cloud", () => {
    // Der klassische SSRF-Treffer: 169.254.169.254 gibt Instanz-Zugangsdaten.
    expect(isBlockedAddress("169.254.169.254")).toBe(true);
  });

  it("sperrt private Netze", () => {
    expect(isBlockedAddress("10.0.0.1")).toBe(true);
    expect(isBlockedAddress("172.16.0.1")).toBe(true);
    expect(isBlockedAddress("172.31.255.255")).toBe(true);
    expect(isBlockedAddress("192.168.1.1")).toBe(true);
    expect(isBlockedAddress("100.64.0.1")).toBe(true);
  });

  it("lässt öffentliche Adressen durch", () => {
    expect(isBlockedAddress("1.1.1.1")).toBe(false);
    expect(isBlockedAddress("172.32.0.1")).toBe(false); // knapp außerhalb /12
    expect(isBlockedAddress("9.255.255.255")).toBe(false); // knapp vor 10/8
    expect(isBlockedAddress("2606:4700:4700::1111")).toBe(false);
  });

  it("sperrt private IPv6-Bereiche", () => {
    expect(isBlockedAddress("fc00::1")).toBe(true);
    expect(isBlockedAddress("fd12:3456::1")).toBe(true);
    expect(isBlockedAddress("fe80::1")).toBe(true);
    expect(isBlockedAddress("ff02::1")).toBe(true);
  });

  it("durchschaut IPv4-in-IPv6-Schreibweise", () => {
    // Ohne diese Behandlung führt "::ffff:169.254.169.254" an der v4-Liste vorbei.
    expect(isBlockedAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isBlockedAddress("::ffff:169.254.169.254")).toBe(true);
    expect(isBlockedAddress("::ffff:a9fe:a9fe")).toBe(true); // dieselbe Adresse hex
    expect(isBlockedAddress("::ffff:1.1.1.1")).toBe(false);
  });

  it("lehnt ab, was keine gültige Adresse ist", () => {
    expect(isBlockedAddress("nicht-ip")).toBe(true);
    expect(isBlockedAddress("")).toBe(true);
    expect(isBlockedAddress("999.999.999.999")).toBe(true);
  });
});

describe("assertUrlAllowed", () => {
  const reasonOf = async (url: string) => {
    try {
      await assertUrlAllowed(url);
      return null;
    } catch (e) {
      return e instanceof SafeFetchError ? e.reason : "anderer-fehler";
    }
  };

  it("lehnt Protokolle ab, die nicht http/https sind", async () => {
    expect(await reasonOf("file:///etc/passwd")).toBe("scheme");
    expect(await reasonOf("gopher://example.test/")).toBe("scheme");
    expect(await reasonOf("data:text/plain,hallo")).toBe("scheme");
    expect(await reasonOf("kein-url")).toBe("scheme");
  });

  it("lehnt Zugangsdaten in der Adresse ab", async () => {
    // "http://harmlos.de@169.254.169.254/" sieht harmlos aus, zielt aber
    // auf den Metadaten-Dienst.
    expect(await reasonOf("http://nutzer:geheim@example.test/")).toBe("credentials");
    expect(await reasonOf("http://example.test@169.254.169.254/")).toBe("credentials");
  });

  it("lehnt direkte IP-Adressen im internen Netz ab", async () => {
    expect(await reasonOf("http://127.0.0.1:5432/")).toBe("blocked_address");
    expect(await reasonOf("http://169.254.169.254/latest/meta-data/")).toBe(
      "blocked_address",
    );
    expect(await reasonOf("http://10.0.0.5/")).toBe("blocked_address");
    expect(await reasonOf("http://[::1]:8080/")).toBe("blocked_address");
  });

  it("lehnt localhost ab, obwohl es ein Name ist", async () => {
    // Läuft über die Namensauflösung und muss dort an 127.0.0.1 scheitern.
    const reason = await reasonOf("http://localhost:5432/");
    expect(["blocked_address", "dns"]).toContain(reason);
  });

  it("lässt eine gewöhnliche öffentliche Adresse durch", async () => {
    const url = await assertUrlAllowed("https://example.com/speisekarte.pdf");
    expect(url.hostname).toBe("example.com");
  });
});
