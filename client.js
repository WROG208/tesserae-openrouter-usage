function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function compact(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Number(value || 0));
}

export default function render(shadow, ctx) {
  const d = ctx.data || {};

  if (d.error) {
    shadow.innerHTML = `
      <style>
        .error { padding: 1rem; font: 700 1rem sans-serif; }
      </style>
      <div class="error">⚠ ${esc(d.error)}</div>
    `;
    return;
  }

  const latest = d.latest || {};
  const days = Array.isArray(d.daily) ? d.daily : [];
  const maximum = Math.max(0.01, ...days.map(day => Number(day.spend || 0)));

  const bars = days.map(day => {
    const height = Math.max(8, Math.round((Number(day.spend || 0) / maximum) * 100));
    const label = String(day.date || "").slice(5);

    return `
      <div class="bar-column">
        <div class="bar-value">${money(day.spend)}</div>
        <div class="bar-space">
          <div class="bar" style="height:${height}%"></div>
        </div>
        <div class="bar-label">${esc(label)}</div>
      </div>
    `;
  }).join("");

  shadow.innerHTML = `
    <style>
      * { box-sizing: border-box; }

      .card {
        height: 100%;
        padding: clamp(12px, 3cqw, 28px);
        color: var(--text-primary, #111);
        background: var(--surface, #fff);
        font-family: var(--font-family, sans-serif);
        display: flex;
        flex-direction: column;
        gap: clamp(8px, 2cqh, 18px);
        overflow: hidden;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        border-bottom: 3px solid currentColor;
        padding-bottom: 8px;
      }

      .title {
        font-size: clamp(18px, 5cqw, 42px);
        font-weight: 900;
        letter-spacing: .04em;
      }

      .status {
        font-size: clamp(10px, 2.1cqw, 17px);
        font-weight: 700;
      }

      .balance {
        display: grid;
        grid-template-columns: 1.25fr 1fr;
        gap: 12px;
      }

      .hero, .metric {
        border: 2px solid currentColor;
        padding: clamp(10px, 2cqw, 20px);
      }

      .label {
        font-size: clamp(10px, 2.1cqw, 17px);
        font-weight: 800;
        text-transform: uppercase;
      }

      .hero-value {
        font-size: clamp(34px, 10cqw, 82px);
        line-height: 1;
        font-weight: 950;
        margin-top: 6px;
      }

      .metric-value {
        font-size: clamp(18px, 5cqw, 38px);
        line-height: 1.1;
        font-weight: 900;
        margin-top: 6px;
      }

      .metrics {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }

      .chart {
        flex: 1;
        min-height: 100px;
        display: flex;
        gap: 8px;
        align-items: stretch;
      }

      .bar-column {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .bar-space {
        flex: 1;
        width: 70%;
        display: flex;
        align-items: end;
        border-bottom: 2px solid currentColor;
      }

      .bar {
        width: 100%;
        background: currentColor;
      }

      .bar-value, .bar-label {
        font-size: clamp(8px, 1.6cqw, 14px);
        font-weight: 800;
        white-space: nowrap;
      }

      .model {
        font-size: clamp(10px, 2cqw, 17px);
        font-weight: 800;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      @container (max-width: 380px) {
        .balance { grid-template-columns: 1fr; }
        .metrics { grid-template-columns: 1fr 1fr; }
        .metrics .metric:last-child { display: none; }
        .chart { display: none; }
      }

      @container (max-width: 220px) {
        .metrics { display: none; }
        .model { display: none; }
      }
    </style>

    <div class="card">
      <div class="header">
        <div class="title">OPENROUTER</div>
        <div class="status">${d.stale ? "CACHED" : "LIVE"}</div>
      </div>

      <div class="balance">
        <div class="hero">
          <div class="label">Available balance</div>
          <div class="hero-value">${money(d.balance)}</div>
        </div>

        <div class="metric">
          <div class="label">Total spent</div>
          <div class="metric-value">${money(d.total_usage)}</div>
          <div class="label">of ${money(d.total_credits)}</div>
        </div>
      </div>

      <div class="metrics">
        <div class="metric">
          <div class="label">Latest day</div>
          <div class="metric-value">${money(latest.spend)}</div>
          <div class="label">${esc(latest.date || "No data")}</div>
        </div>

        <div class="metric">
          <div class="label">Tokens</div>
          <div class="metric-value">${compact(
            Number(latest.prompt_tokens || 0) +
            Number(latest.completion_tokens || 0)
          )}</div>
          <div class="label">
            ${compact(latest.prompt_tokens)} in /
            ${compact(latest.completion_tokens)} out
          </div>
        </div>

        <div class="metric">
          <div class="label">Requests</div>
          <div class="metric-value">${compact(latest.requests)}</div>
          <div class="label">${compact(latest.reasoning_tokens)} reasoning</div>
        </div>
      </div>

      <div class="label">Seven-day spend</div>
      <div class="chart">${bars}</div>

      <div class="model">TOP MODEL: ${esc(d.top_model || "No activity")}</div>
    </div>
  `;
}
