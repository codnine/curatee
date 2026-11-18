export default function Home() {
  return (
    <main className="coming-soon-page">
      <section className="coming-soon-frame" aria-labelledby="coming-soon-title">
        <header className="coming-soon-header">
          <span className="coming-soon-wordmark">CURATE AI</span>
          <span className="coming-soon-location">SRI LANKA</span>
        </header>
        <div className="coming-soon-message">
          <p className="coming-soon-kicker"><span className="coming-soon-dot" aria-hidden="true" />A NEW CHAPTER IS TAKING SHAPE</p>
          <h1 id="coming-soon-title">Something great<br /><em>is curating.</em></h1>
          <p className="coming-soon-description">We&apos;re making something special.<br />We&apos;ll be back soon.</p>
        </div>
        <div className="coming-soon-footer">
          <span>CURATE AI</span>
          <span>COMING SOON</span>
        </div>
      </section>
    </main>
  )
}
