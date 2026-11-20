/**
 * node-postgres 8.23+ трактует `sslmode=require` как `verify-full` и падает
 * на самоподписанном корне в цепочке Supabase (`SELF_SIGNED_CERT_IN_CHAIN`).
 * `uselibpqcompat=true` возвращает семантику libpq: `require` шифрует
 * соединение без проверки CA — так же, как описано в SPEC §8.2.
 *
 * Параметр добавляется только для Node-драйвера. `psql` и `pg_dump` получают
 * исходную строку, потому что libpq не знает `uselibpqcompat`.
 */
export function withLibpqSslCompat(connectionString: string): string {
  try {
    const url = new URL(connectionString);

    if (url.searchParams.get("sslmode") !== "require") {
      return connectionString;
    }
    if (url.searchParams.has("uselibpqcompat")) {
      return connectionString;
    }

    url.searchParams.set("uselibpqcompat", "true");

    return url.toString();
  } catch {
    return connectionString;
  }
}
