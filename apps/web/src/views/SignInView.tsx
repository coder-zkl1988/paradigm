// Generated from design/SignIn.dc.html by scripts/dc-to-jsx.py. Do not edit by hand:
// change the draft or the view model that fills `v`, then run the script again.
/* eslint-disable */
import { Fragment } from 'react';
import { css } from '../lib/css';

export function SignInView({ v }: { v: any }) {
  return (
    <>
    <main onPointerMove={v.onMove} style={css("position: relative; min-height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 72px 16px 40px; background-color: #FFFFFF; background-image: linear-gradient(rgba(0,0,0,0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.016) 1px, transparent 1px); background-size: 40px 40px;")}>
      <button className="pg-btn" type="button" aria-label={v.t?.language} onClick={v.flipLang} style={css("position: absolute; top: 16px; right: 16px; height: 40px; padding: 0 14px; background: #FFFFFF; border: 1px solid #E3E4E8; border-radius: 12px; font-size: 14px")}>
        {v.langShort}
      </button>
      <div style={css("position: relative; width: 100%; max-width: 420px; margin-top: 44px; box-sizing: border-box; padding: 64px 28px 24px; background: #FFFFFF; border: 1px solid #E3E4E8; border-radius: 26px; box-shadow: 0 16px 44px rgba(20,20,30,0.09); display: flex; flex-direction: column; gap: 18px")}>
        <div className="si-bot" aria-hidden="true" ref={v.botRef} style={css(v.bot?.wrap)}>
          <svg viewBox="0 0 100 100" width="88" height="88" style={css("display: block; overflow: visible")}>
            <circle cx="50" cy="50" r="52" fill="#FFFFFF" />
            <path d="M50 4V-9" stroke="#FFFFFF" strokeWidth="11.5" strokeLinecap="round" />
            <circle cx="50" cy="-13" r="10" fill="#FFFFFF" />
            <path d="M50 3V-9" stroke="#2B2B2B" strokeWidth="3.6" strokeLinecap="round" />
            <circle cx="50" cy="-13" r="6" fill="#EF5B4C" stroke="#2B2B2B" strokeWidth="3.2" />
            <circle cx="50" cy="50" r="47" fill="#BFD7FF" stroke="#2B2B2B" strokeWidth="3.4" />
            <path d="M21.5 36a31 31 0 0 1 13.5-14" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" opacity="0.85" />
            <path d="M92.500 43A44 44 0 0 1 31.500 90A60 60 0 0 0 92.500 43Z" fill="#9CC0F8" />
            <ellipse cx="18.500" cy="62" rx="5.500" ry="3.400" fill="#F7A8C0" opacity="0.9" />
            <ellipse cx="81.500" cy="62" rx="5.500" ry="3.400" fill="#F7A8C0" opacity="0.9" />
            <ellipse cx="37" cy="50" rx="11" ry="13" fill="#FFFFFF" stroke="#2B2B2B" strokeWidth="3" style={css(v.bot?.glL)} />
            <ellipse cx="63" cy="50" rx="11" ry="13" fill="#FFFFFF" stroke="#2B2B2B" strokeWidth="3" style={css(v.bot?.glR)} />
            <g style={css(v.bot?.eyesOuter)}>
              <g fill="none" stroke="#1F2024" strokeLinecap="round" strokeLinejoin="round" style={css(v.bot?.eyesInner)}>
                <path d={v.bot?.eyeL} strokeWidth={v.bot?.wL} />
                <path d={v.bot?.eyeR} strokeWidth={v.bot?.wR} />
                <circle cx="38.6" cy="47.4" r="1.9" fill="#FFFFFF" stroke="none" style={css(v.bot?.glL)} />
                <circle cx="64.6" cy="47.4" r="1.9" fill="#FFFFFF" stroke="none" style={css(v.bot?.glR)} />
              </g>
            </g>
          </svg>
        </div>
        <div style={css("display: flex; flex-direction: column; gap: 6px; text-align: center")}>
          <h1 style={css("margin: 0; font-family: 'Space Grotesk', Inter, sans-serif; font-size: 28px; font-weight: 300; letter-spacing: -0.02em")}>
            {v.title}
          </h1>
        </div>
        <form onSubmit={v.onSubmit} style={css("display: flex; flex-direction: column; gap: 12px")}>
          {v.isUp ? (<>
            <div style={css("display: flex; flex-direction: column; gap: 6px")}>
              <label htmlFor="si-name" style={css("position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap")}>
                {v.t?.name}
              </label>
              <div style={css("position: relative")}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={css("position: absolute; left: 15px; top: 15px; color: #6B6C73; pointer-events: none")}>
                  <circle cx="12" cy="9" r="3.6" />
                  <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
                </svg>
                <input id="si-name" className="pg-field" type="text" autoComplete="off" placeholder={v.t?.namePh} value={v.name} onChange={v.onName} onFocus={v.focusName} onBlur={v.blur} style={css("height: 48px; padding-left: 44px")} />
              </div>
            </div>
          </>) : null}
          <div style={css("display: flex; flex-direction: column; gap: 6px")}>
            <label htmlFor="si-email" style={css("position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap")}>
              {v.t?.email}
            </label>
            <div style={css("position: relative")}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={css("position: absolute; left: 15px; top: 15px; color: #6B6C73; pointer-events: none")}>
                <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
                <path d="M4.5 8l7.5 5.5L19.5 8" />
              </svg>
              <input id="si-email" className="pg-field" type="email" autoComplete="off" placeholder={v.t?.emailPh} value={v.email} onChange={v.onEmail} onFocus={v.focusEmail} onBlur={v.blur} style={css("height: 48px; padding-left: 44px")} />
            </div>
          </div>
          <div style={css("display: flex; flex-direction: column; gap: 6px")}>
            <label htmlFor="si-pw" style={css("position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap")}>
              {v.t?.password}
            </label>
            <div style={css("position: relative")}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={css("position: absolute; left: 15px; top: 15px; color: #6B6C73; pointer-events: none")}>
                <rect x="5.5" y="11" width="13" height="9.5" rx="2.5" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              <input id="si-pw" className="pg-field" type={v.pwType} autoComplete="off" placeholder={v.t?.pwPh} value={v.pw} onChange={v.onPw} onFocus={v.focusPw} onBlur={v.blur} style={css("height: 48px; padding-left: 44px; padding-right: 52px")} />
              <button className="pg-btn" type="button" aria-label={v.showLabel} aria-pressed={v.showPressed} onPointerDown={v.keepFocus} onClick={v.toggleShow} style={css("position: absolute; right: 4px; top: 4px; width: 40px; height: 40px; justify-content: center; color: #3A3B40")}>
                {v.pwHidden ? (<>
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.700" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12c2.500-4.500 5.500-6.500 9-6.500s6.500 2 9 6.500c-2.500 4.500-5.500 6.500-9 6.500S5.500 16.500 3 12z" />
                    <circle cx="12" cy="12" r="2.800" />
                  </svg>
                </>) : null}
                {v.pwShown ? (<>
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.700" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 9c2.200 3.400 4.900 5 8 5s5.800-1.600 8-5M12 14v3M7 12.800l-1.500 2.400M17 12.800l1.500 2.400" />
                  </svg>
                </>) : null}
              </button>
            </div>
          </div>
          {v.hasError ? (<>
            <p role="alert" style={css("margin: 0; font-size: 13px; color: #B42318")}>
              {v.error}
            </p>
          </>) : null}
          {v.ready ? (<>
            <a className="pg-link" href={v.links?.Workspace} onClick={v.follow} style={css(v.primary)}>
              <span>
                {v.go}
              </span>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </>) : null}
          {v.notReady ? (<>
            <button className="pg-btn" type="submit" style={css(v.primary)}>
              <span>
                {v.go}
              </span>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </>) : null}
        </form>
        <div aria-hidden="true" style={css("display: flex; align-items: center; gap: 12px; color: #6B6C73; font-size: 13px")}>
          <span style={css("flex: 1 1 auto; height: 1px; background: #E3E4E8")} />
          <span>
            {v.t?.or}
          </span>
          <span style={css("flex: 1 1 auto; height: 1px; background: #E3E4E8")} />
        </div>
        <div className="si-alt" style={css("display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px")}>
          {v.hasGoogle ? (<>
            <a className="pg-link" href={v.links?.Workspace} onClick={v.follow} data-provider="google" aria-label={v.t?.withGoogle} style={css(v.secondary)}>
              {v.logo?.google ? (<>
                <img src={v.logo?.google} alt="" width="18" height="18" style={css("display: block; flex: 0 0 auto")} />
              </>) : null}
              {v.logo?.no_google ? (<>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M3.5 12h17M12 3.5c2.300 2.400 3.400 5.200 3.400 8.500s-1.100 6.100-3.400 8.500c-2.300-2.400-3.400-5.200-3.400-8.500s1.100-6.100 3.400-8.500z" />
                </svg>
              </>) : null}
              <span>
                {v.t?.google}
              </span>
            </a>
          </>) : null}
          {v.hasGitHub ? (<>
            <a className="pg-link" href={v.links?.Workspace} onClick={v.follow} data-provider="github" aria-label={v.t?.withGitHub} style={css(v.secondary)}>
              {v.logo?.github ? (<>
                <img src={v.logo?.github} alt="" width="18" height="18" style={css("display: block; flex: 0 0 auto")} />
              </>) : null}
              {v.logo?.no_github ? (<>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.500 4v10.500" />
                  <circle cx="17.500" cy="6.500" r="2.500" />
                  <circle cx="6.500" cy="17.500" r="2.500" />
                  <path d="M17.500 9a8.500 8.500 0 0 1-8.500 8.500" />
                </svg>
              </>) : null}
              <span>
                {v.t?.github}
              </span>
            </a>
          </>) : null}
          {v.hasSso ? (<>
            <a className="pg-link" href={v.links?.Workspace} onClick={v.follow} data-provider="sso" style={css(v.secondary)}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8.5" cy="15.5" r="3.5" />
                <path d="M11 13l8.5-8.5M16 8.500l2.500 2.500" />
              </svg>
              <span>
                {v.t?.sso}
              </span>
            </a>
          </>) : null}
          <button className="pg-btn" type="button" onClick={v.sendLink} style={css(v.secondary)}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.500 11.500L20 4l-5.500 16-3-6.500z" />
              <path d="M11.500 13.500L20 4" />
            </svg>
            <span>
              {v.t?.magic}
            </span>
          </button>
        </div>
        {v.sent ? (<>
          <p role="status" style={css("margin: 0; font-size: 13px; line-height: 1.5; color: #1F6B3A")}>
            {v.sentMsg}
          </p>
        </>) : null}
        <div style={css("display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px")}>
          <button className="pg-btn" type="button" onClick={v.toggleMode} style={css("height: 36px; padding: 0 10px; gap: 6px; color: #2457C5; font-size: 14px")}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="9" r="3.6" />
              <path d="M3 20c.8-3.600 3.600-5.500 7-5.500 1.500 0 2.800.400 3.900 1M18 14v6M15 17h6" />
            </svg>
            <span>
              {v.switchAction}
            </span>
          </button>
          {v.isIn ? (<>
            <a href="#si-email" style={css("height: 36px; padding: 0 10px; display: flex; align-items: center; gap: 6px; font-size: 14px")}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="8.500" />
                <path d="M9.700 9.500a2.400 2.400 0 1 1 3.500 2.200c-.800.500-1.200 1-1.200 1.900M12 16.800v.200" />
              </svg>
              <span>
                {v.t?.forgot}
              </span>
            </a>
          </>) : null}
        </div>
        <a className="pg-link" href={v.links?.Main} onClick={v.follow} style={css("margin: 0 -28px -24px; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; border-top: 1px solid #EEEFF2; border-radius: 0 0 26px 26px; background: #FAFAFB; font-size: 14px")}>
          <span>
            {v.t?.guest}
          </span>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </div>
    </main>
    </>
  );
}
