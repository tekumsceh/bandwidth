function TestingGround() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Testing Ground</h1>
          <div className="page-header-sub">Temporary sandbox for trying feature interactions safely.</div>
        </div>
      </header>

      <section className="event-detail-section">
        <h2>Purpose</h2>
        <p>
          Use this page to prototype new interactions before integrating them into core pages. Keep all temporary
          experiments isolated and removable.
        </p>
      </section>

      <section className="event-detail-section" style={{ marginTop: '1rem' }}>
        <h2>Feature checklist</h2>
        <ul className="lineup-list">
          <li>
            <span className="lineup-name">1.</span>
            <span className="lineup-role">Define feature objective and expected outcome.</span>
          </li>
          <li>
            <span className="lineup-name">2.</span>
            <span className="lineup-role">Prototype here first.</span>
          </li>
          <li>
            <span className="lineup-name">3.</span>
            <span className="lineup-role">Run manual checks + automated tests.</span>
          </li>
          <li>
            <span className="lineup-name">4.</span>
            <span className="lineup-role">Promote to production pages only after approval.</span>
          </li>
        </ul>
      </section>
    </div>
  );
}

export default TestingGround;

