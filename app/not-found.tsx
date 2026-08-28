import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card">
      <h2>页面不存在</h2>
      <p className="muted">检查一下链接，或回到首页。</p>
      <Link className="btn" href="/">
        回首页
      </Link>
    </div>
  );
}
