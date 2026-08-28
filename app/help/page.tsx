import { PageTransition } from "@/components/page-transition";

export default function HelpPage() {
  return (
    <PageTransition>
      <div className="stack">
        <div className="page-head">
          <h1>帮助 / 关于</h1>
        </div>
        <section className="card">
          <h3>快速上手</h3>
          <ol style={{ paddingLeft: 18 }}>
            <li>注册账号并在设置中选择 3 门小三门、填写总人数与目标。</li>
            <li>在「数据」页直接填表，或下载 Excel 模板批量导入。</li>
            <li>回到首页查看趋势、最近考试与差距。</li>
            <li>打开「分析」看异常、单科影响、相关性和提分空间。</li>
            <li>需要时用 AI 追问策略，用笔记记下复盘。</li>
          </ol>
        </section>
        <section className="card">
          <h3>Excel 模板</h3>
          <p className="muted">登录后可下载按你启用科目动态生成的 29 列表格。</p>
          <a className="btn mt-sm" href="/api/template">
            下载模板
          </a>
          <ul className="mt-sm" style={{ paddingLeft: 18 }}>
            <li>日期格式 YYYY-MM-DD</li>
            <li>字段可留空</li>
            <li>考试名称 + 日期相同会合并填充（空字段才覆盖）</li>
            <li>小三门等级：A+ 到 E</li>
          </ul>
        </section>
        <section className="card">
          <h3>FAQ</h3>
          <p>
            <strong>如何导入？</strong> 数据页或设置页选择 Excel/CSV，预览 diff 后确认。
          </p>
          <p>
            <strong>如何修改目标？</strong> 设置 → 长期目标。
          </p>
          <p>
            <strong>忘记密码？</strong> 请联系管理员手动重置。
          </p>
          <p>
            <strong>百分比是空的？</strong> 先在设置中填写班级 / 年级 / 全市总人数。
          </p>
        </section>
        <section className="card">
          <h3>反馈</h3>
          <p>
            GitHub Issues：{" "}
            <a href="https://github.com/Yuer6327/Rank-Track/issues">Yuer6327/Rank-Track</a>
          </p>
          <p className="mt-sm">或联系管理员：Yuer6327</p>
        </section>
      </div>
    </PageTransition>
  );
}
