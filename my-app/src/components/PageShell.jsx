export default function PageShell({ title, subtitle, left, right, children }) {
  return (
    <div className="container">
      <div className="headerRow">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {left}
          <div className="titleBlock">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>

        {right}
      </div>

      {children}
    </div>
  )
}
