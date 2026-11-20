// Generated from design/Workspace.dc.html by scripts/dc-to-jsx.py. Do not edit by hand:
// change the draft or the view model that fills `v`, then run the script again.
/* eslint-disable */
import { Fragment } from 'react';
import { css } from '../lib/css';

export function WorkspaceView({ v }: { v: any }) {
  return (
    <>
    {v.showBoard ? (<>
      <div style={css("position: relative; width: 100%; min-height: 100vh; background: #FFFFFF")}>
        {v.embed}
      </div>
    </>) : null}
    {v.showHome ? (<>
      <main style={css("min-height: 100vh; display: flex; flex-wrap: wrap; align-items: stretch; background: #F6F6F8")}>
        <aside style={css("flex: 1 1 248px; max-width: 100%; box-sizing: border-box; padding: 16px; background: #FFFFFF; border-right: 1px solid #E3E4E8; display: flex; flex-direction: column; gap: 18px")}>
          <div style={css("display: flex; flex-direction: column; gap: 4px")}>
            <button className="pg-btn" type="button" aria-expanded={v.wsExpanded} onClick={v.toggleWs} style={css("height: 48px; padding: 0 10px; gap: 10px; border: 1px solid #E3E4E8; border-radius: 12px; justify-content: space-between")}>
              <span style={css("display: flex; align-items: center; gap: 10px; min-width: 0")}>
                <span aria-hidden="true" style={css("flex: 0 0 auto; width: 28px; height: 28px; border-radius: 8px; background: #E7EEFB; color: #2457C5; display: flex; align-items: center; justify-content: center")}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                    <path d="M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z" />
                  </svg>
                </span>
                <span style={css("font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                  {v.wsName}
                </span>
              </span>
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#74757C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {v.wsOpen ? (<>
              <div role="menu" style={css("padding: 4px; border: 1px solid #E3E4E8; border-radius: 12px; display: flex; flex-direction: column; gap: 2px")}>
                {(v.wsList || []).map((w: any, i0: number) => (
                  <Fragment key={i0}>
                    <button className="pg-btn" type="button" role="menuitemradio" aria-checked={w?.checked} onClick={w?.pick} style={css(w?.style)}>
                      {w?.name}
                    </button>
                  </Fragment>
                ))}
              </div>
            </>) : null}
          </div>
          <nav aria-label={v.t?.sections} style={css("display: flex; flex-direction: column; gap: 2px")}>
            {(v.nav || []).map((n: any, i0: number) => (
              <Fragment key={i0}>
                <button className="pg-btn" type="button" aria-current={n?.current} onClick={n?.pick} style={css(n?.style)}>
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.700" strokeLinecap="round" strokeLinejoin="round">
                    <path d={n?.icon} />
                  </svg>
                  <span>
                    {n?.label}
                  </span>
                </button>
              </Fragment>
            ))}
          </nav>
          <section style={css("display: flex; flex-direction: column; gap: 8px")}>
            <div style={css("display: flex; align-items: center; justify-content: space-between; padding: 0 4px")}>
              <h2 style={css("margin: 0; font-size: 12px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.04em; color: #6B6C73")}>
                {v.t?.members}
              </h2>
              <button className="pg-btn" type="button" aria-expanded={v.inviteExpanded} onClick={v.toggleInvite} style={css("height: 32px; padding: 0 10px; font-size: 13px; color: #2457C5")}>
                {v.t?.invite}
              </button>
            </div>
            <ul style={css("margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 2px")}>
              {(v.members || []).map((m: any, i0: number) => (
                <Fragment key={i0}>
                  <li style={css("display: flex; align-items: center; gap: 10px; padding: 6px 4px")}>
                    <span aria-hidden="true" style={css(m?.dot)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="9" r="3.600" />
                        <path d="M5 20c.800-3.600 3.600-5.500 7-5.500s6.200 1.900 7 5.500" />
                      </svg>
                    </span>
                    <span style={css("display: flex; flex-direction: column; min-width: 0; flex: 1 1 auto")}>
                      <span style={css("font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                        {m?.name}
                      </span>
                      <span style={css("font-size: 12px; color: #6B6C73")}>
                        {m?.role}
                      </span>
                    </span>
                    {m?.pending ? (<>
                      <button className="pg-btn" type="button" aria-label={m?.removeLabel} onClick={m?.remove} style={css("flex: 0 0 auto; width: 32px; height: 32px; justify-content: center; color: #6B6C73")}>
                        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </>) : null}
                  </li>
                </Fragment>
              ))}
            </ul>
          </section>
          <div style={css("margin-top: auto; display: flex; align-items: center; gap: 8px; padding-top: 12px; border-top: 1px solid #EEEFF2")}>
            <span style={css("flex: 1 1 auto; min-width: 0; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
              {v.t?.you}
            </span>
            <button className="pg-btn" type="button" aria-label={v.t?.language} onClick={v.flipLang} style={css("height: 36px; padding: 0 10px; font-size: 13px; border: 1px solid #E3E4E8")}>
              {v.langShort}
            </button>
            <a className="pg-link" href={v.links?.SignIn} onClick={v.follow} style={css("height: 36px; padding: 0 10px; display: flex; align-items: center; font-size: 13px; border: 1px solid #E3E4E8; border-radius: 10px")}>
              {v.t?.signOut}
            </a>
          </div>
        </aside>
        <div style={css("flex: 999 1 560px; min-width: 0; box-sizing: border-box; padding: 32px; display: flex; flex-direction: column; gap: 28px")}>
          <header style={css("display: flex; flex-wrap: wrap; align-items: center; gap: 12px")}>
            <h1 style={css("flex: 1 1 200px; margin: 0; font-family: 'Space Grotesk', Inter, sans-serif; font-size: 30px; font-weight: 300; letter-spacing: -0.02em")}>
              {v.viewTitle}
            </h1>
            <label htmlFor="ws-search" style={css("position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)")}>
              {v.t?.search}
            </label>
            <input id="ws-search" className="pg-field" type="text" autoComplete="off" placeholder={v.t?.search} value={v.query} onChange={v.onQuery} style={css("flex: 1 1 200px; max-width: 280px")} />
            <a className="pg-link" href={v.links?.Main} onClick={v.follow} style={css("height: 44px; padding: 0 16px; display: flex; align-items: center; gap: 8px; border-radius: 12px; background: #2457C5; color: #FFFFFF; font-size: 15px; font-weight: 500")}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>
                {v.t?.newBoard}
              </span>
            </a>
          </header>
          <p style={css("margin: -16px 0 0; font-size: 12.5px; color: #6B6C73")}>
            {v.t?.sample}
          </p>
          {v.showBoards ? (<>
            <section style={css("display: flex; flex-direction: column; gap: 12px")}>
              <h2 style={css("margin: 0; font-size: 15px; font-weight: 400; color: #6B6C73")}>
                {v.listTitle}
              </h2>
              <div style={css("display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px")}>
                {(v.boards || []).map((b: any, i0: number) => (
                  <Fragment key={i0}>
                    <div style={css("display: flex; flex-direction: column; gap: 6px; min-width: 0")}>
                      <a className="pg-link pg-card" href={b?.href || v.links?.Main} onClick={v.follow} style={css("display: flex; flex-direction: column; gap: 10px; padding: 10px; background: #FFFFFF; border: 1px solid #E3E4E8; border-radius: 16px")}>
                        <span aria-hidden="true" style={css("position: relative; display: block; height: 124px; border-radius: 10px; overflow: hidden; background-color: #FFFFFF; background-image: linear-gradient(rgba(0,0,0,0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.016) 1px, transparent 1px); background-size: 20px 20px;")}>
                          <span style={css("position: absolute; left: 18px; top: 26px; width: 62px; height: 40px; border-radius: 7px; background: #FFFFFF; border: 1px solid #D2D3D9")} />
                          <span style={css("position: absolute; left: 80px; top: 45px; width: 34px; height: 1.5px; background: #111114")} />
                          <span style={css("position: absolute; left: 114px; top: 26px; width: 62px; height: 40px; border-radius: 7px; background: #FFFFFF; border: 1px solid #D2D3D9")} />
                          <span style={css(`position: absolute; left: 114px; top: 76px; width: 62px; height: 30px; border-radius: 3px; background: ${b?.tint}`)} />
                        </span>
                        <span style={css("display: flex; flex-direction: column; gap: 2px; padding: 0 4px 4px; min-width: 0")}>
                          <span style={css("font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                            {b?.name}
                          </span>
                          <span style={css("font-size: 12.5px; color: #6B6C73")}>
                            {b?.meta}
                          </span>
                        </span>
                      </a>
                      {b?.trash ? (<>
                        <button className="pg-btn" type="button" onClick={b?.restore} style={css("height: 36px; justify-content: center; border: 1px solid #DCDDE2; font-size: 13px")}>
                          {v.t?.restore}
                        </button>
                      </>) : null}
                    </div>
                  </Fragment>
                ))}
              </div>
            </section>
          </>) : null}
          {v.showTemplates ? (<>
            <section style={css("display: flex; flex-direction: column; gap: 12px")}>
              <h2 style={css("margin: 0; font-size: 15px; font-weight: 400; color: #6B6C73")}>
                {v.t?.startFrom}
              </h2>
              <div style={css("display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px")}>
                {v.tpl?.code ? (<>
                  <button className="pg-link pg-card pg-open" type="button" onClick={v.openCode} style={css("display: flex; align-items: center; gap: 14px; padding: 16px; background: #FFFFFF; border: 1px solid #E3E4E8; border-radius: 16px")}>
                    <svg aria-hidden="true" width="52" height="52" viewBox="0 0 48 48" style={css("display: block; flex: 0 0 auto; overflow: visible; filter: drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.2))")}>
                      <path d="M10 11h28a2 2 0 0 1 2 2v18H8V13a2 2 0 0 1 2-2z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="7.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M19.5 17l-4.5 4.5 4.5 4.5M28.5 17l4.5 4.5-4.5 4.5M26 15.5l-4 12" fill="none" stroke="#FFFFFF" strokeWidth="7.9" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M4.5 31h39l-2.5 6h-34z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="7.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M10 11h28a2 2 0 0 1 2 2v18H8V13a2 2 0 0 1 2-2z" fill="#2A2B30" stroke="#2B2B2B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M19.5 17l-4.5 4.5 4.5 4.5M28.5 17l4.5 4.5-4.5 4.5M26 15.5l-4 12" fill="none" stroke="#7EE2B8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M4.5 31h39l-2.5 6h-34z" fill="#C9CBD2" stroke="#2B2B2B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                    </svg>
                    <span style={css("display: flex; flex-direction: column; gap: 3px; min-width: 0")}>
                      <span style={css("font-size: 12px; color: #6B6C73")}>
                        {v.t?.forCode}
                      </span>
                      <span style={css("font-size: 16px")}>
                        {v.t?.tCode}
                      </span>
                      <span style={css("font-size: 13px; line-height: 1.4; color: #6B6C73")}>
                        {v.t?.dCode}
                      </span>
                    </span>
                  </button>
                </>) : null}
                {v.tpl?.ux ? (<>
                  <button className="pg-link pg-card pg-open" type="button" onClick={v.openUx} style={css("display: flex; align-items: center; gap: 14px; padding: 16px; background: #FFFFFF; border: 1px solid #E3E4E8; border-radius: 16px")}>
                    <svg aria-hidden="true" width="52" height="52" viewBox="0 0 48 48" style={css("display: block; flex: 0 0 auto; overflow: visible; filter: drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.2))")}>
                      <path d="M13 5h20a3 3 0 0 1 3 3v32a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="7.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M14.5 22.5h17M14.5 26.5h11" fill="none" stroke="#FFFFFF" strokeWidth="8.2" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M26 26l14 6.5-5.8 2-2 5.8z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="7.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M13 5h20a3 3 0 0 1 3 3v32a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" fill="#FFFFFF" stroke="#2B2B2B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M14 10h18v8H14z" fill="#B4A3F0" stroke="none" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M14.5 22.5h17M14.5 26.5h11" fill="none" stroke="#C9CBD2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M14 31h10v5.5H14z" fill="#8E7AE0" stroke="none" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M26 26l14 6.5-5.8 2-2 5.8z" fill="#2A2B30" stroke="#2B2B2B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                    </svg>
                    <span style={css("display: flex; flex-direction: column; gap: 3px; min-width: 0")}>
                      <span style={css("font-size: 12px; color: #6B6C73")}>
                        {v.t?.forUx}
                      </span>
                      <span style={css("font-size: 16px")}>
                        {v.t?.tUx}
                      </span>
                      <span style={css("font-size: 13px; line-height: 1.4; color: #6B6C73")}>
                        {v.t?.dUx}
                      </span>
                    </span>
                  </button>
                </>) : null}
                {v.tpl?.visual ? (<>
                  <button className="pg-link pg-card pg-open" type="button" onClick={v.openVisual} style={css("display: flex; align-items: center; gap: 14px; padding: 16px; background: #FFFFFF; border: 1px solid #E3E4E8; border-radius: 16px")}>
                    <svg aria-hidden="true" width="52" height="52" viewBox="0 0 48 48" style={css("display: block; flex: 0 0 auto; overflow: visible; filter: drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.2))")}>
                      <path d="M24 6c10.5 0 18.5 7 18.5 16 0 6-4 9-9 9h-3.5c-2.5 0-3.5 2-2.5 4s0 6-3.5 6C13.5 41 5.5 34 5.5 24S13.5 6 24 6z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="7.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M12.3 19.5a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="7.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M20.8 13.5a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="7.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M29.8 17.5a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="7.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M10.3 29.5a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="7.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M29.5 43l10.5-14" fill="none" stroke="#FFFFFF" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M29.5 43l10.5-14" fill="none" stroke="#FFFFFF" strokeWidth="8.6" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M40 29l2.2-3.2" fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M40 29l2.2-3.2" fill="none" stroke="#FFFFFF" strokeWidth="9.4" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M24 6c10.5 0 18.5 7 18.5 16 0 6-4 9-9 9h-3.5c-2.5 0-3.5 2-2.5 4s0 6-3.5 6C13.5 41 5.5 34 5.5 24S13.5 6 24 6z" fill="#F6DDB0" stroke="#2B2B2B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M12.3 19.5a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0z" fill="#EF5B4C" stroke="#2B2B2B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M20.8 13.5a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0z" fill="#FFD25E" stroke="#2B2B2B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M29.8 17.5a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0z" fill="#6FA8F5" stroke="#2B2B2B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M10.3 29.5a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0z" fill="#7CC47F" stroke="#2B2B2B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M29.5 43l10.5-14" fill="none" stroke="#2B2B2B" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M29.5 43l10.5-14" fill="none" stroke="#C98F64" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M40 29l2.2-3.2" fill="none" stroke="#2B2B2B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                      <path d="M40 29l2.2-3.2" fill="none" stroke="#B4A3F0" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                    </svg>
                    <span style={css("display: flex; flex-direction: column; gap: 3px; min-width: 0")}>
                      <span style={css("font-size: 12px; color: #6B6C73")}>
                        {v.t?.forVisual}
                      </span>
                      <span style={css("font-size: 16px")}>
                        {v.t?.tVisual}
                      </span>
                      <span style={css("font-size: 13px; line-height: 1.4; color: #6B6C73")}>
                        {v.t?.dVisual}
                      </span>
                    </span>
                  </button>
                </>) : null}
              </div>
            </section>
          </>) : null}
          {v.showGallery ? (<>
            <section style={css("display: flex; flex-direction: column; gap: 14px")}>
              <p style={css("margin: 0; max-width: 640px; font-size: 15px; line-height: 1.5; color: #6B6C73")}>
                {v.t?.galleryIntro}
              </p>
              <div role="group" aria-label={v.t?.filter} style={css("display: flex; flex-wrap: wrap; gap: 8px")}>
                {(v.cats || []).map((ct: any, i0: number) => (
                  <Fragment key={i0}>
                    <button className="pg-btn" type="button" aria-pressed={ct?.pressed} onClick={ct?.pick} style={css(ct?.style)}>
                      {ct?.label}
                    </button>
                  </Fragment>
                ))}
              </div>
              <div style={css("display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px")}>
                {(v.gallery || []).map((g: any, i0: number) => (
                  <Fragment key={i0}>
                    <button className="pg-link pg-card pg-tpl pg-open" type="button" onClick={g?.open} style={css("display: flex; flex-direction: column; background: #FFFFFF; border: 1px solid #E3E4E8; border-radius: 18px; overflow: hidden")}>
                      <span aria-hidden="true" style={css(g?.preview)}>
                        {(g?.chain || []).map((cn: any, i2: number) => (
                          <Fragment key={i2}>
                            {cn?.arrow ? (<>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B6C73" strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" style={css("flex: 0 0 auto")}>
                                <path d="M4 12h15M13 6l6 6-6 6" />
                              </svg>
                            </>) : null}
                            <span style={css("position: relative; display: block; flex: 0 0 auto; width: 30px; height: 30px; filter: drop-shadow(0 1px 1.5px rgba(0,0,0,0.26))")}>
                              {(cn?.layers || []).map((L: any, i4: number) => (
                                <Fragment key={i4}>
                                  <svg width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                                    <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                                  </svg>
                                </Fragment>
                              ))}
                            </span>
                          </Fragment>
                        ))}
                      </span>
                      <span style={css("display: flex; flex-direction: column; gap: 8px; padding: 16px 18px 16px")}>
                        <span style={css("display: flex; align-items: center; gap: 8px")}>
                          <span style={css(g?.tagStyle)}>
                            {g?.tag}
                          </span>
                          <span style={css("font-size: 12.5px; color: #6B6C73")}>
                            {g?.count}
                          </span>
                        </span>
                        <span style={css("font-size: 18px; line-height: 1.3")}>
                          {g?.name}
                        </span>
                        <span style={css("font-size: 13px; line-height: 1.5; color: #6B6C73")}>
                          {g?.steps}
                        </span>
                        <span style={css("display: flex; align-items: center; gap: 6px; margin-top: 4px; padding-top: 12px; border-top: 1px solid #EEEFF2; font-size: 14px; color: #2457C5")}>
                          <span>
                            {v.t?.useTpl}
                          </span>
                          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </span>
                      </span>
                    </button>
                  </Fragment>
                ))}
              </div>
            </section>
          </>) : null}
          {v.hasEmpty ? (<>
            <div style={css("padding: 48px 16px; border: 1px dashed #D2D3D9; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center")}>
              <p style={css("margin: 0; font-size: 18px")}>
                {v.emptyTitle}
              </p>
              <p style={css("margin: 0; font-size: 14px; line-height: 1.5; color: #6B6C73")}>
                {v.emptySub}
              </p>
            </div>
          </>) : null}
        </div>
        {v.inviteOpen ? (<>
          <div onPointerDown={v.closeInvite} style={css("position: fixed; inset: 0; z-index: 20; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(17,17,20,0.32)")}>
            <div role="dialog" aria-label={v.inviteTitle} onPointerDown={v.stopEv} style={css("width: 100%; max-width: 480px; max-height: 100%; overflow: auto; box-sizing: border-box; padding: 24px; background: #FFFFFF; border-radius: 22px; box-shadow: 0 20px 60px rgba(20,20,30,0.22); display: flex; flex-direction: column; gap: 18px")}>
              <div style={css("display: flex; align-items: flex-start; justify-content: space-between; gap: 12px")}>
                <h2 style={css("margin: 0; font-family: 'Space Grotesk', Inter, sans-serif; font-size: 24px; font-weight: 300; letter-spacing: -0.01em")}>
                  {v.inviteTitle}
                </h2>
                <button className="pg-btn" type="button" aria-label={v.t?.close} onClick={v.closeInvite} style={css("flex: 0 0 auto; width: 36px; height: 36px; justify-content: center")}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              {v.inviteForm ? (<>
                <form onSubmit={v.sendInvite} style={css("display: flex; flex-direction: column; gap: 18px")}>
                  <div style={css("display: flex; flex-direction: column; gap: 6px")}>
                    <label htmlFor="ws-invite" style={css("font-size: 13px; color: #3A3B40")}>
                      {v.t?.inviteEmails}
                    </label>
                    <input id="ws-invite" className="pg-field" type="text" autoComplete="off" placeholder="ana@example.com, li@example.com" autoFocus={true} value={v.inviteEmail} onChange={v.onInviteEmail} style={css("height: 48px")} />
                    {v.inviteOk ? (<>
                      <span style={css("font-size: 12.5px; color: #6B6C73")}>
                        {v.t?.inviteHint}
                      </span>
                    </>) : null}
                    {v.inviteError ? (<>
                      <span role="alert" style={css("font-size: 13px; color: #B42318")}>
                        {v.inviteErrorText}
                      </span>
                    </>) : null}
                  </div>
                  <div role="radiogroup" aria-label={v.t?.role} style={css("display: flex; flex-direction: column; gap: 6px")}>
                    <span style={css("font-size: 13px; color: #3A3B40")}>
                      {v.t?.role}
                    </span>
                    <div style={css("display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px")}>
                      {(v.roles || []).map((r: any, i0: number) => (
                        <Fragment key={i0}>
                          <button className="pg-btn" type="button" role="radio" aria-checked={r?.checked} onClick={r?.pick} style={css(r?.style)}>
                            <span style={css("font-size: 15px")}>
                              {r?.label}
                            </span>
                            <span style={css("font-size: 12.5px; line-height: 1.4; color: #6B6C73")}>
                              {r?.desc}
                            </span>
                          </button>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  <div style={css("display: flex; justify-content: flex-end; gap: 8px")}>
                    <button className="pg-btn" type="button" onClick={v.closeInvite} style={css("height: 44px; padding: 0 16px; border: 1px solid #DCDDE2; font-size: 15px")}>
                      {v.t?.cancel}
                    </button>
                    <button className="pg-btn" type="submit" style={css("height: 44px; padding: 0 18px; background: #2457C5; color: #FFFFFF; font-size: 15px; font-weight: 500")}>
                      {v.sendLabel}
                    </button>
                  </div>
                </form>
              </>) : null}
              {v.inviteDone ? (<>
                <div style={css("display: flex; flex-direction: column; gap: 14px")}>
                  <div style={css("display: flex; align-items: center; gap: 12px")}>
                    <span aria-hidden="true" style={css("flex: 0 0 auto; width: 40px; height: 40px; border-radius: 50%; background: #DDF3E4; color: #1F6B3A; display: flex; align-items: center; justify-content: center")}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                    <p role="status" style={css("margin: 0; font-size: 15px; line-height: 1.5")}>
                      {v.sentSub}
                    </p>
                  </div>
                  <ul style={css("margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px")}>
                    {(v.sentList || []).map((sn: any, i0: number) => (
                      <Fragment key={i0}>
                        <li style={css("display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px solid #E3E4E8; border-radius: 12px; font-size: 14px")}>
                          <span style={css("min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                            {sn?.email}
                          </span>
                          <span style={css("flex: 0 0 auto; color: #6B6C73")}>
                            {sn?.role}
                          </span>
                        </li>
                      </Fragment>
                    ))}
                  </ul>
                  <div style={css("display: flex; justify-content: flex-end; gap: 8px")}>
                    <button className="pg-btn" type="button" onClick={v.inviteMore} style={css("height: 44px; padding: 0 16px; border: 1px solid #DCDDE2; font-size: 15px")}>
                      {v.t?.inviteMore}
                    </button>
                    <button className="pg-btn" type="button" onClick={v.closeInvite} style={css("height: 44px; padding: 0 18px; background: #2457C5; color: #FFFFFF; font-size: 15px; font-weight: 500")}>
                      {v.t?.done}
                    </button>
                  </div>
                </div>
              </>) : null}
            </div>
          </div>
        </>) : null}
      </main>
    </>) : null}
    </>
  );
}
