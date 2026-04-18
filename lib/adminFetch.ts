/**
 * 管理者API用fetchラッパー
 * 403が返ったらログイン画面にリダイレクト
 */
export async function adminFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 403) {
    window.location.href = "/admin/login";
    throw new Error("Unauthorized");
  }
  return res;
}
