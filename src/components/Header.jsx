export default function Header({ title }) {
  return (
    <header className="app-header">
      <div className="app-title-row">
        <span className="app-title-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" role="presentation" focusable="false">
            <circle className="icon-orbit" cx="24" cy="24" r="15" />
            <circle className="icon-core" cx="24" cy="24" r="5.5" />
            <path className="icon-spark" d="M24 6v5M24 37v5M6 24h5M37 24h5" />
          </svg>
        </span>
        <h1 className="app-title">{title}</h1>
      </div>
    </header>
  );
}
