export async function onRequest(context) {
  return new Response("【連休中のため一時閉鎖中】週明けに再開いたします。", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=UTF-8" },
  });
}
