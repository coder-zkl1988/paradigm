// Generated from design/Main.dc.html by scripts/dc-to-jsx.py. Do not edit by hand:
// change the draft or the view model that fills `v`, then run the script again.
/* eslint-disable */
import { Fragment } from 'react';
import { css } from '../lib/css';

export function BoardView({ v }: { v: any }) {
  return (
    <>
    <main onKeyUp={v.onKeyUp} onPointerMove={v.onMove} onPointerLeave={v.onLeave} onPointerUp={v.onUp} onPointerCancel={v.onUp} onKeyDown={v.onKey} style={css(v.mainStyle)}>
      <div className="wb-board" role="region" aria-label={v.i?.k0} tabIndex={-1} ref={v.boardRef} onPointerDown={v.onBoardDown} onDoubleClick={v.onBoardDbl} onContextMenu={v.onBoardMenu} onWheel={v.onWheel} style={css(v.boardStyle)}>
        <div style={css(v.worldStyle)}>
          {(v.items || []).map((it: any, i0: number) => (
            <Fragment key={i0}>
              <div onPointerDown={it?.down} onDoubleClick={it?.dbl} onContextMenu={it?.menu} style={css(it?.style)}>
                {(it?.layers || []).map((L: any, i2: number) => (
                  <Fragment key={i2}>
                    <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} preserveAspectRatio={L?.par} style={css("position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none")}>
                      <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeDasharray={L?.dash} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} vectorEffect={L?.ve} style={css(L?.pe)} />
                    </svg>
                  </Fragment>
                ))}
                {it?.isNode ? (<>
                  <div style={css(it?.card)}>
                    <div style={css(it?.head)}>
                      {it?.showStk ? (<>
                        <span aria-hidden="true" style={css(v.stkBox)}>
                          {(it?.stk || []).map((L: any, i2: number) => (
                            <Fragment key={i2}>
                              <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                                <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                              </svg>
                            </Fragment>
                          ))}
                        </span>
                      </>) : null}
                      {it?.helper ? (<>
                        <span aria-hidden="true" style={css("position: relative; flex: 0 0 auto; width: 22px; height: 22px; margin: 0 2px")}>
                          <span style={css(`position: absolute; inset: -4px; border-radius: 50%; border: 2px solid transparent; border-top-color: ${v.accent}; border-right-color: ${v.accent}; animation: wb-spin 1s linear infinite`)} />
                          <svg viewBox="0 0 100 100" width="22" height="22" style={css("display: block")}>
                            <circle cx="50" cy="50" r="46" fill="#BFD7FF" stroke="#2B2B2B" strokeWidth="6" />
                            <path d="M37 50h.01M63 50h.01" stroke="#2B2B2B" strokeWidth="16" strokeLinecap="round" />
                          </svg>
                        </span>
                      </>) : null}
                      <span style={css("flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; font-weight: 400; color: #111114")}>
                        {it?.title}
                      </span>
                      <span style={css(it?.idStyle)}>
                        {it?.idLabel}
                      </span>
                      {it?.canOpen ? (<>
                        <button className="wb-btn" type="button" title={it?.openLabel} aria-label={it?.openLabel} aria-expanded={it?.expanded} onPointerDown={v.stopEv} onClick={it?.toggleOpen} style={css(it?.openStyle)}>
                          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
                          </svg>
                        </button>
                      </>) : null}
                      {it?.canRun ? (<>
                        <button className="wb-btn" type="button" title={v.i?.k1} aria-label={v.i?.k1} onPointerDown={v.stopEv} onClick={it?.run} style={css("width: 32px; height: 32px; border-radius: 9px")}>
                          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5.5v13l11-6.5z" />
                          </svg>
                        </button>
                      </>) : null}
                    </div>
                    {it?.pvShow ? (<>
                      <div style={css(it?.pv)}>
                        {it?.pvChrome ? (<>
                          <div aria-hidden="true" style={css("flex: 0 0 auto; height: 22px; display: flex; align-items: center; gap: 4px; padding: 0 8px; background: #F0F1F4; border-bottom: 1px solid #E3E4E8")}>
                            <span style={css("width: 6px; height: 6px; border-radius: 50%; background: #C9CBD2")} />
                            <span style={css("width: 6px; height: 6px; border-radius: 50%; background: #C9CBD2")} />
                            <span style={css("width: 6px; height: 6px; border-radius: 50%; background: #C9CBD2")} />
                          </div>
                        </>) : null}
                        {it?.pvIcon ? (<>
                          <svg aria-hidden="true" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d={it?.pvIconD} />
                          </svg>
                        </>) : null}
                        {it?.pvHead ? (<>
                          <div style={css(it?.pvHeadStyle)}>
                            {it?.pvHeadText}
                          </div>
                        </>) : null}
                        {it?.pvPre ? (<>
                          <div style={css(it?.pvPreStyle)}>
                            {it?.pvPreText}
                          </div>
                        </>) : null}
                        {(it?.blocks || []).map((bk: any, i2: number) => (
                          <Fragment key={i2}>
                            <div style={css(bk?.style)}>
                              {bk?.text}
                              {(bk?.cells || []).map((cl: any, i4: number) => (
                                <Fragment key={i4}>
                                  <span style={css(cl?.style)}>
                                    {cl?.text}
                                  </span>
                                </Fragment>
                              ))}
                              {(bk?.rows || []).map((br: any, i4: number) => (
                                <Fragment key={i4}>
                                  <div style={css(br?.style)}>
                                    {(br?.cells || []).map((cl: any, i6: number) => (
                                      <Fragment key={i6}>
                                        <span style={css(cl?.style)}>
                                          {cl?.text}
                                        </span>
                                      </Fragment>
                                    ))}
                                  </div>
                                </Fragment>
                              ))}
                            </div>
                          </Fragment>
                        ))}
                        {(it?.bars || []).map((b: any, i2: number) => (
                          <Fragment key={i2}>
                            <span style={css(b?.style)} />
                          </Fragment>
                        ))}
                        {it?.hasChips ? (<>
                          <div style={css("flex: 0 0 auto; display: flex; gap: 4px; overflow: hidden")}>
                            {(it?.chips || []).map((ch: any, i2: number) => (
                              <Fragment key={i2}>
                                <span title={ch?.name} style={css("flex: 0 0 auto; display: flex; align-items: center; gap: 3px; height: 22px; box-sizing: border-box; padding: 0 5px 0 3px; border: 1px solid #E3E4E8; border-radius: 999px; background: #FFFFFF; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 11px; color: #3A3B40")}>
                                  <span aria-hidden="true" style={css("position: relative; display: block; flex: 0 0 auto; width: 14px; height: 14px; filter: drop-shadow(0 1px 1.5px rgba(0,0,0,0.26))")}>
                                    {(ch?.stk || []).map((L: any, i4: number) => (
                                      <Fragment key={i4}>
                                        <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                                          <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                                        </svg>
                                      </Fragment>
                                    ))}
                                  </span>
                                  <span>
                                    {ch?.count}
                                  </span>
                                </span>
                              </Fragment>
                            ))}
                          </div>
                        </>) : null}
                        {it?.pvCap ? (<>
                          <span style={css(it?.pvCapStyle)}>
                            {it?.pvCapText}
                          </span>
                        </>) : null}
                      </div>
                    </>) : null}
                    {(it?.acts || []).map((a: any, i2: number) => (
                      <Fragment key={i2}>
                        <button className="wb-primary" type="button" disabled={a?.disabled} onPointerDown={v.stopEv} onClick={a?.pick} style={css(a?.style)}>
                          {a?.label}
                        </button>
                      </Fragment>
                    ))}
                    <div style={css(it?.foot)}>
                      <span style={css("overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0")}>
                        {it?.io}
                      </span>
                      <span style={css(it?.statStyle)}>
                        {it?.stat}
                      </span>
                    </div>
                  </div>
                  {it?.hasIn ? (<>
                    <span aria-hidden="true" style={css(it?.portIn)} />
                  </>) : null}
                  <span aria-hidden="true" onPointerDown={it?.portDown} style={css(it?.portOut)} />
                </>) : null}
                {it?.showText ? (<>
                  <div style={css(it?.textBox)}>
                    <div style={css(it?.textStyle)}>
                      {it?.text}
                    </div>
                  </div>
                </>) : null}
                {it?.editText ? (<>
                  <div style={css(it?.textBox)}>
                    <textarea className="wb-ta" aria-label={it?.ariaText} placeholder={it?.placeholder} wrap={it?.wrap} autoFocus={true} onFocus={v.caretEnd} value={it?.text} onChange={it?.onText} style={css(it?.taStyle)} />
                  </div>
                </>) : null}
                {it?.showLabel ? (<>
                  <div style={css(it?.labelStyle)}>
                    {it?.label}
                  </div>
                </>) : null}
                {it?.editLabel ? (<>
                  <input className="wb-ta" type="text" aria-label={v.i?.k2} autoFocus={true} onFocus={v.caretEnd} value={it?.label} onChange={it?.onLabel} style={css(it?.labelStyle)} />
                </>) : null}
                {it?.isSticky ? (<>
                  <span style={css("position: absolute; left: 18px; bottom: 12px; font-size: 12px; color: rgba(0,0,0,0.6); pointer-events: none")}>
                    {v.i?.k60}
                  </span>
                </>) : null}
              </div>
            </Fragment>
          ))}
          {v.hz?.show ? (<>
            <div onPointerDown={v.stopEv} onDoubleClick={v.stopEv} onContextMenu={v.stopEv} style={css(v.hz?.region)}>
              <span style={css("position: absolute; left: 18px; top: 12px; font-size: 12.5px; color: #1A46A8")}>
                {v.hz?.title}
              </span>
              <div style={css("position: absolute; left: 14px; right: 14px; bottom: 10px; height: 44px; display: flex; align-items: center; gap: 10px")}>
                {v.hz?.canPause ? (<>
                  <button className="wb-primary" type="button" onClick={v.hz?.pause} style={css(v.hz?.pauseStyle)}>
                    {v.hz?.pauseLabel}
                  </button>
                </>) : null}
                <label htmlFor="wb-hz-scrub" style={css("flex: 0 0 auto; font-size: 12.5px; color: #6B6C73")}>
                  {v.hz?.replayLabel}
                </label>
                <input id="wb-hz-scrub" type="range" min="0" max={v.hz?.max} step="1" value={v.hz?.val} onChange={v.hz?.onScrub} style={css(`flex: 0 1 150px; min-width: 80px; accent-color: ${v.accent}`)} />
                <span style={css("flex: 0 0 auto; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 12px; color: #3A3B40; white-space: nowrap")}>
                  {v.hz?.stepLabel}
                </span>
                <span style={css("flex: 1 1 auto; min-width: 0; font-size: 12.5px; color: #111114; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                  {v.hz?.now}
                </span>
              </div>
            </div>
            <svg aria-hidden="true" width="10" height="10" style={css("position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; z-index: 4")}>
              <path d={v.hz?.links?.folder?.d} fill="none" stroke={v.hz?.links?.folder?.stroke} strokeWidth={v.hz?.links?.folder?.w} strokeLinecap="round" strokeDasharray="7 7" opacity={v.hz?.links?.folder?.op} style={css(v.hz?.links?.folder?.style)} />
              <path d={v.hz?.links?.agent?.d} fill="none" stroke={v.hz?.links?.agent?.stroke} strokeWidth={v.hz?.links?.agent?.w} strokeLinecap="round" strokeDasharray="7 7" opacity={v.hz?.links?.agent?.op} style={css(v.hz?.links?.agent?.style)} />
              <path d={v.hz?.links?.terminal?.d} fill="none" stroke={v.hz?.links?.terminal?.stroke} strokeWidth={v.hz?.links?.terminal?.w} strokeLinecap="round" strokeDasharray="7 7" opacity={v.hz?.links?.terminal?.op} style={css(v.hz?.links?.terminal?.style)} />
              <path d={v.hz?.links?.connector?.d} fill="none" stroke={v.hz?.links?.connector?.stroke} strokeWidth={v.hz?.links?.connector?.w} strokeLinecap="round" strokeDasharray="7 7" opacity={v.hz?.links?.connector?.op} style={css(v.hz?.links?.connector?.style)} />
              <path d={v.hz?.links?.phone?.d} fill="none" stroke={v.hz?.links?.phone?.stroke} strokeWidth={v.hz?.links?.phone?.w} strokeLinecap="round" strokeDasharray="7 7" opacity={v.hz?.links?.phone?.op} style={css(v.hz?.links?.phone?.style)} />
              <path d={v.hz?.links?.browser?.d} fill="none" stroke={v.hz?.links?.browser?.stroke} strokeWidth={v.hz?.links?.browser?.w} strokeLinecap="round" strokeDasharray="7 7" opacity={v.hz?.links?.browser?.op} style={css(v.hz?.links?.browser?.style)} />
              <path d={v.hz?.links?.tool?.d} fill="none" stroke={v.hz?.links?.tool?.stroke} strokeWidth={v.hz?.links?.tool?.w} strokeLinecap="round" strokeDasharray="7 7" opacity={v.hz?.links?.tool?.op} style={css(v.hz?.links?.tool?.style)} />
            </svg>
            {(v.hz?.labels || []).map((lb: any, i0: number) => (
              <Fragment key={i0}>
                <span style={css(lb?.style)}>
                  {lb?.text}
                </span>
              </Fragment>
            ))}
            {(v.hz?.tools || []).map((t: any, i0: number) => (
              <Fragment key={i0}>
                <div onPointerDown={v.stopEv} onDoubleClick={v.stopEv} onContextMenu={v.stopEv} style={css(t?.style)}>
                  <button className="wb-btn" type="button" aria-pressed={t?.pressed} title={t?.pickTip} onClick={t?.pick} style={css("justify-content: flex-start; gap: 10px; text-align: left; border-radius: 8px; min-width: 0; flex: 0 0 auto")}>
                    <span aria-hidden="true" style={css("position: relative; display: block; flex: 0 0 auto; width: 28px; height: 28px; filter: drop-shadow(0 1px 1.5px rgba(0,0,0,0.26))")}>
                      {(t?.stk || []).map((L: any, i2: number) => (
                        <Fragment key={i2}>
                          <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                            <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                          </svg>
                        </Fragment>
                      ))}
                    </span>
                    <span style={css("display: flex; flex-direction: column; gap: 2px; min-width: 0")}>
                      <span style={css("font-size: 14px; color: #111114; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                        {t?.kind}
                      </span>
                      <span style={css("font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 11.5px; color: #6B6C73; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                        {t?.target}
                      </span>
                    </span>
                  </button>
                  <span style={css("font-size: 12.5px; line-height: 1.4; color: #6B6C73; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                    {t?.summary}
                  </span>
                  {t?.hasSubs ? (<>
                    <div style={css("display: flex; align-items: center; gap: 5px; min-width: 0")}>
                      <span style={css("font-size: 11.5px; color: #6B6C73")}>
                        {t?.usesLabel}
                      </span>
                      {(t?.subs || []).map((sb: any, i2: number) => (
                        <Fragment key={i2}>
                          <span style={css("display: flex; align-items: center; gap: 4px; height: 22px; padding: 0 6px 0 3px; border: 1px dashed #A9ABB4; border-radius: 999px; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 11px; color: #3A3B40; white-space: nowrap")}>
                            <span aria-hidden="true" style={css("position: relative; display: block; flex: 0 0 auto; width: 14px; height: 14px; filter: drop-shadow(0 1px 1.5px rgba(0,0,0,0.26))")}>
                              {(sb?.stk || []).map((L: any, i4: number) => (
                                <Fragment key={i4}>
                                  <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                                    <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                                  </svg>
                                </Fragment>
                              ))}
                            </span>
                            <span>
                              {sb?.name}
                            </span>
                          </span>
                        </Fragment>
                      ))}
                    </div>
                  </>) : null}
                  <button className="wb-btn" type="button" title={t?.cycleTip} onClick={t?.cycle} style={css("align-self: flex-start; gap: 6px; height: 26px; padding: 0 9px; border: 1px solid #DCDDE2; border-radius: 999px; background: #FFFFFF; font-size: 12px; color: #111114")}>
                    <span aria-hidden="true" style={css(t?.dot)} />
                    <span>
                      {t?.state}
                    </span>
                  </button>
                </div>
              </Fragment>
            ))}
          </>) : null}
          {v.cmp?.show ? (<>
            <button className="wb-primary" type="button" onPointerDown={v.stopEv} onClick={v.cmp?.open} style={css(v.cmp?.style)}>
              {v.cmp?.label}
            </button>
          </>) : null}
          {(v.badges || []).map((bd: any, i0: number) => (
            <Fragment key={i0}>
              <div style={css(bd?.style)}>
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinejoin="round">
                  <path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.6A7.5 7.5 0 1 1 20 11.5z" />
                </svg>
                <span>
                  {bd?.count}
                </span>
              </div>
            </Fragment>
          ))}
          {v.hasGhost ? (<>
            <div style={css(v.ghostStyle)} />
          </>) : null}
          {v.hasSelBox ? (<>
            <div style={css(v.selBoxStyle)}>
              {(v.handles || []).map((hd: any, i0: number) => (
                <Fragment key={i0}>
                  <div onPointerDown={hd?.down} style={css(hd?.style)} />
                </Fragment>
              ))}
            </div>
          </>) : null}
          {(v.mBoxes || []).map((mb: any, i0: number) => (
            <Fragment key={i0}>
              <div style={css(mb?.style)} />
            </Fragment>
          ))}
          {v.hasMarquee ? (<>
            <div style={css(v.marqueeStyle)} />
          </>) : null}
          {v.kcShow ? (<>
            <div style={css(v.kcBox)} />
          </>) : null}
          {(v.dots || []).map((dt: any, i0: number) => (
            <Fragment key={i0}>
              <div onPointerDown={dt?.down} style={css(dt?.style)} />
            </Fragment>
          ))}
          {(v.ah || []).map((ahd: any, i0: number) => (
            <Fragment key={i0}>
              <div onPointerDown={ahd?.down} onDoubleClick={ahd?.dbl} style={css(ahd?.style)}>
                <span aria-hidden="true" style={css(ahd?.dot)} />
              </div>
            </Fragment>
          ))}
        </div>
      </div>
      <button className="wb-mono" type="button" aria-label={v.mono?.aria} aria-pressed={v.mono?.pressed} title={v.mono?.title} onClick={v.mono?.click} style={css(v.mono?.wrap)}>
        <span style={css(v.mono?.bob)}>
          <span style={css(v.mono?.halo)} />
          <span style={css(v.mono?.body)} />
          {v.mono?.spinner ? (<>
            <span style={css(v.mono?.spin)} />
          </>) : null}
          <svg aria-hidden="true" viewBox="0 0 100 100" fill="none" stroke="#1F2024" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" style={css("display: block; position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible")}>
            <path d="M50 4V-9" stroke="#FFFFFF" strokeWidth="11.5" />
            <circle cx="50" cy="-13" r="10" fill="#FFFFFF" stroke="none" />
            <path d="M50 3V-9" stroke="#2B2B2B" strokeWidth="3.6" />
            <circle cx="50" cy="-13" r="6" fill="#EF5B4C" stroke="#2B2B2B" strokeWidth="3.2" />
            <path d="M21.500 36a31 31 0 0 1 13.500-14" stroke="#FFFFFF" strokeWidth="3.6" opacity="0.85" />
            <g stroke={v.accent} strokeWidth="3.2">
              <path d="M-1.2 22.8A58 58 0 0 0 -1.2 77.2" style={css(v.mono?.wave1)} />
              <path d="M101.2 22.8A58 58 0 0 1 101.2 77.2" style={css(v.mono?.wave1)} />
              <path d="M-10 18.1A68 68 0 0 0 -10 81.9" style={css(v.mono?.wave2)} />
              <path d="M110 18.1A68 68 0 0 1 110 81.9" style={css(v.mono?.wave2)} />
              <path d="M-18.9 13.4A78 78 0 0 0 -18.9 86.6" style={css(v.mono?.wave3)} />
              <path d="M118.9 13.4A78 78 0 0 1 118.9 86.6" style={css(v.mono?.wave3)} />
            </g>
            <path d="M95.3 42A46 46 0 0 1 30.6 91.7A62 62 0 0 0 95.3 42Z" fill="#9CC0F8" stroke="none" />
            <ellipse cx="18.5" cy="62" rx="5.5" ry="3.4" fill="#F7A8C0" stroke="none" opacity="0.9" />
            <ellipse cx="81.5" cy="62" rx="5.5" ry="3.4" fill="#F7A8C0" stroke="none" opacity="0.9" />
            <g style={css(v.mono?.eyesInner)}>
              <g style={css(v.mono?.whites)}>
                <ellipse cx="37" cy="50" rx="11" ry="13" fill="#FFFFFF" stroke="#2B2B2B" strokeWidth="3" />
                <ellipse cx="63" cy="50" rx="11" ry="13" fill="#FFFFFF" stroke="#2B2B2B" strokeWidth="3" />
              </g>
              <g style={css(v.mono?.eyesOuter)}>
                <path d={v.mono?.eyeL} stroke="#2B2B2B" strokeWidth={v.mono?.eyeW} />
                <path d={v.mono?.eyeR} stroke="#2B2B2B" strokeWidth={v.mono?.eyeW} />
                <circle cx="38.8" cy="47.6" r="1.8" fill="#FFFFFF" stroke="none" style={css(v.mono?.glint)} />
                <circle cx="64.8" cy="47.6" r="1.8" fill="#FFFFFF" stroke="none" style={css(v.mono?.glint)} />
              </g>
            </g>
          </svg>
        </span>
        {v.mono?.alert ? (<>
          <span style={css(v.mono?.badge)}>
            !
          </span>
        </>) : null}
      </button>
      {v.mono?.listening ? (<>
        <div role="status" style={css(v.mono?.capsule)}>
          <span aria-hidden="true" style={css("display: flex; align-items: center; gap: 3px; height: 20px")}>
            {(v.mono?.bars || []).map((eb: any, i0: number) => (
              <Fragment key={i0}>
                <span style={css(eb?.style)} />
              </Fragment>
            ))}
          </span>
          <span style={css("font-size: 13.5px")}>
            {v.mono?.listenLabel}
          </span>
          <button className="wb-btn" type="button" aria-label={v.mono?.stopLabel} title={v.mono?.stopLabel} onClick={v.mono?.click} style={css("width: 28px; height: 28px; border-radius: 50%; background: #FFFFFF; color: #111114")}>
            <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10">
              <rect width="10" height="10" rx="2.2" fill="currentColor" />
            </svg>
          </button>
        </div>
      </>) : null}
      {v.mono?.hasSay ? (<>
        <div role="status" style={css(v.mono?.sayStyle)}>
          {v.mono?.say}
        </div>
      </>) : null}
      {v.welcome ? (<>
        <div style={css(`position: absolute; left: 0; right: 0; top: ${v.welcomeTop}; transition: top 650ms cubic-bezier(0.3, 0.9, 0.3, 1); display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 0 16px; text-align: center; pointer-events: none`)}>
          <h1 style={css("margin: 0; font-family: 'Space Grotesk', Inter, sans-serif; font-size: 36px; font-weight: 300; letter-spacing: -0.02em; color: #111114")}>
            {v.i?.k61}
          </h1>
          <p style={css("margin: 0; max-width: 540px; font-size: 16px; line-height: 1.5; color: #6B6C73")}>
            {v.i?.k62}
          </p>
          <div style={css("display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 10px; pointer-events: auto")}>
            {(v.starters || []).map((st: any, i0: number) => (
              <Fragment key={i0}>
                <button className="wb-chip" type="button" onClick={st?.pick} style={css("flex-direction: row; align-items: center; gap: 12px; width: 268px")}>
                  <span aria-hidden="true" style={css("flex: 0 0 auto; display: block; position: relative; width: 48px; height: 48px; filter: drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.2))")}>
                    {(st?.layers || []).map((L: any, i2: number) => (
                      <Fragment key={i2}>
                        <svg width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                          <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                        </svg>
                      </Fragment>
                    ))}
                  </span>
                  <span style={css("display: flex; flex-direction: column; gap: 4px; min-width: 0")}>
                    <span style={css("font-size: 12px; color: #6B6C73")}>
                      {st?.who}
                    </span>
                    <span style={css("font-size: 15px; color: #111114")}>
                      {st?.title}
                    </span>
                    <span style={css("font-size: 13px; line-height: 1.35; color: #6B6C73")}>
                      {st?.desc}
                    </span>
                  </span>
                </button>
              </Fragment>
            ))}
          </div>
        </div>
      </>) : null}
      <div style={css("position: absolute; top: 14px; right: 16px; z-index: 8; display: flex; flex-direction: column; align-items: flex-end; gap: 8px")}>
        <div className="wb-bar" style={css("display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: 16px")}>
          {v.acct?.embedded ? (<>
            <button className="wb-btn wb-dock" type="button" onClick={v.acct?.goHome} style={css("height: 38px; padding: 0 12px 0 8px; gap: 6px; border-radius: 11px; font-size: 14px")}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
              <span>
                {v.acct?.homeLabel}
              </span>
            </button>
            <span className="wb-sep" aria-hidden="true" />
          </>) : null}
          {v.acct?.signedIn ? (<>
            <button className="wb-btn wb-dock" type="button" aria-label={v.acct?.wsAria} aria-expanded={v.acct?.wsExpanded} onClick={v.acct?.toggleWs} style={css("height: 38px; padding: 0 8px 0 6px; gap: 8px; border-radius: 11px; font-size: 14px")}>
              <span aria-hidden="true" style={css(v.acct?.wsChip)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                  <rect x="4" y="4" width="7" height="7" rx="1.5" />
                  <rect x="13" y="4" width="7" height="7" rx="1.5" />
                  <rect x="4" y="13" width="7" height="7" rx="1.5" />
                  <rect x="13" y="13" width="7" height="7" rx="1.5" />
                </svg>
              </span>
              <span style={css("max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                {v.acct?.wsName}
              </span>
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#74757C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </>) : null}
          {v.acct?.guest ? (<>
            <button className="wb-btn wb-dock" type="button" aria-label={v.acct?.wsAria} aria-expanded={v.acct?.wsExpanded} onClick={v.acct?.toggleWs} style={css("height: 38px; padding: 0 10px; gap: 8px; border-radius: 11px; font-size: 14px")}>
              <span>
                {v.acct?.guestLabel}
              </span>
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#74757C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </>) : null}
          <span role="status" style={css(v.acct?.saveStyle)}>
            <span aria-hidden="true" style={css(v.acct?.saveDot)} />
            <span>
              {v.acct?.saveLabel}
            </span>
          </span>
          <span className="wb-sep" aria-hidden="true" />
          <button className="wb-btn wb-dock" type="button" aria-expanded={v.acct?.shareExpanded} onClick={v.acct?.openShare} style={css("height: 38px; padding: 0 12px; border-radius: 11px; font-size: 14px")}>
            {v.acct?.shareLabel}
          </button>
          <button className="wb-btn wb-dock wb-tip wb-tip-down" type="button" data-tip={v.acct?.langTip} aria-label={v.acct?.langTip} onClick={v.acct?.flipLang} style={css("width: 44px; height: 38px; border-radius: 11px; font-size: 13.5px")}>
            {v.acct?.langShort}
          </button>
          {v.acct?.signedIn ? (<>
            <button className="wb-btn wb-dock" type="button" aria-label={v.acct?.userAria} aria-expanded={v.acct?.userExpanded} onClick={v.acct?.toggleUser} style={css("width: 38px; height: 38px; border-radius: 50%")}>
              <span aria-hidden="true" style={css("width: 28px; height: 28px; border-radius: 50%; background: #111114; color: #FFFFFF; display: flex; align-items: center; justify-content: center")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="9" r="3.6" />
                  <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
                </svg>
              </span>
            </button>
          </>) : null}
          {v.acct?.guest ? (<>
            <a className="wb-menu-item" href={v.links?.SignIn} onClick={v.follow} style={css(v.acct?.signInStyle)}>
              {v.acct?.signInLabel}
            </a>
          </>) : null}
        </div>
        {v.acct?.wsOpen ? (<>
          <div className="wb-bar" role="menu" aria-label={v.acct?.wsAria} style={css("width: 272px; box-sizing: border-box; padding: 6px; border-radius: 14px")}>
            {v.acct?.guest ? (<>
              <p style={css("margin: 6px 12px 8px; font-size: 13px; line-height: 1.45; color: #6B6C73")}>
                {v.acct?.guestNote}
              </p>
            </>) : null}
            {v.acct?.signedIn ? (<>
              <p style={css("margin: 6px 12px 4px; font-size: 12px; color: #6B6C73; text-transform: uppercase; letter-spacing: 0.04em")}>
                {v.acct?.wsHeading}
              </p>
              {(v.acct?.wsList || []).map((w: any, i0: number) => (
                <Fragment key={i0}>
                  <button className="wb-menu-item" type="button" role="menuitemradio" aria-checked={w?.checked} onClick={w?.pick}>
                    <span style={css("overflow: hidden; text-overflow: ellipsis")}>
                      {w?.name}
                    </span>
                    {w?.on ? (<>
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={v.accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </>) : null}
                  </button>
                </Fragment>
              ))}
              <div aria-hidden="true" style={css("height: 1px; background: #EEEFF2; margin: 4px 6px")} />
              <a className="wb-menu-item" role="menuitem" href={v.links?.Workspace} onClick={v.acct?.goHome}>
                <span>
                  {v.acct?.allBoards}
                </span>
              </a>
              <a className="wb-menu-item" role="menuitem" href={v.links?.Workspace} onClick={v.acct?.goHome}>
                <span>
                  {v.acct?.membersLabel}
                </span>
              </a>
            </>) : null}
            <div aria-hidden="true" style={css("height: 1px; background: #EEEFF2; margin: 4px 6px")} />
            <button className="wb-menu-item" type="button" role="menuitem" onClick={v.acct?.newBoard}>
              <span>
                {v.acct?.newBoardLabel}
              </span>
            </button>
            <button className="wb-menu-item" type="button" role="menuitem" onClick={v.acct?.download}>
              <span>
                {v.acct?.downloadLabel}
              </span>
            </button>
          </div>
        </>) : null}
        {v.acct?.userOpen ? (<>
          <div className="wb-bar" role="menu" aria-label={v.i?.k5} style={css("width: 264px; box-sizing: border-box; padding: 6px; border-radius: 14px")}>
            <div style={css("padding: 8px 12px 10px; display: flex; flex-direction: column; gap: 2px")}>
              <span style={css("font-size: 14px; color: #111114")}>
                {v.i?.k66}
              </span>
              <span style={css("font-size: 12.5px; color: #6B6C73")}>
                {v.i?.k67}
              </span>
            </div>
            <div aria-hidden="true" style={css("height: 1px; background: #EEEFF2; margin: 0 6px 4px")} />
            <p style={css("margin: 6px 12px 4px; font-size: 12px; color: #6B6C73; text-transform: uppercase; letter-spacing: 0.04em")}>
              {v.i?.k4}
            </p>
            {(v.acct?.langs || []).map((lg: any, i0: number) => (
              <Fragment key={i0}>
                <button className="wb-menu-item" type="button" role="menuitemradio" aria-checked={lg?.checked} onClick={lg?.pick}>
                  <span>
                    {lg?.name}
                  </span>
                  {lg?.on ? (<>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={v.accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </>) : null}
                </button>
              </Fragment>
            ))}
            <div aria-hidden="true" style={css("height: 1px; background: #EEEFF2; margin: 4px 6px")} />
            <a className="wb-menu-item" role="menuitem" href={v.links?.SignIn} onClick={v.follow}>
              <span>
                {v.i?.k68}
              </span>
            </a>
          </div>
        </>) : null}
      </div>
      {v.ai?.open ? (<>
        <aside className="wb-bar" aria-label={v.i?.k6} style={css("position: absolute; top: 72px; right: 16px; bottom: 130px; width: 340px; max-width: calc(100% - 32px); box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; z-index: 6")}>
          <div style={css("flex: 0 0 auto; display: flex; flex-direction: column; gap: 10px; padding: 14px 14px 10px; border-bottom: 1px solid #EEEFF2")}>
            <div style={css("display: flex; align-items: flex-start; justify-content: space-between; gap: 8px")}>
              <div>
                <h2 style={css("margin: 0; font-size: 15px; font-weight: 400")}>
                  {v.i?.k6}
                </h2>
                <p style={css("margin: 2px 0 0; font-size: 12.5px; color: #6B6C73")}>
                  {v.ai?.sub}
                </p>
              </div>
              <button className="wb-btn" type="button" aria-label={v.i?.k7} onClick={v.ai?.close} style={css("width: 32px; height: 32px")}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div style={css("display: flex; align-items: center; gap: 6px")}>
              <button className="wb-primary" type="button" aria-pressed={v.ai?.outlinePressed} onClick={v.ai?.setOutline} style={css(v.ai?.outlineStyle)}>
                {v.i?.k69}
              </button>
              <button className="wb-primary" type="button" aria-pressed={v.ai?.jsonPressed} onClick={v.ai?.setJson} style={css(v.ai?.jsonStyle)}>
                JSON
              </button>
              <span style={css("flex: 1 1 auto")} />
              <button className="wb-primary" type="button" onClick={v.ai?.copy} style={css("height: 32px; background: #F3F4F6; color: #111114")}>
                {v.i?.k70}
              </button>
            </div>
            <button className="wb-primary" type="button" onClick={v.ai?.suggest} style={css(v.ai?.suggestStyle)}>
              {v.i?.k71}
            </button>
          </div>
          {v.ai?.showOutline ? (<>
            <div style={css("flex: 1 1 auto; overflow: auto; padding: 6px")}>
              {(v.ai?.rows || []).map((r: any, i0: number) => (
                <Fragment key={i0}>
                  <button className="wb-menu-item" type="button" onClick={r?.pick} style={css(r?.style)}>
                    <span style={css("display: flex; align-items: baseline; gap: 10px; min-width: 0")}>
                      <span style={css("flex: 0 0 16px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; color: #6B6C73; text-align: right")}>
                        {r?.n}
                      </span>
                      <span style={css("display: flex; flex-direction: column; gap: 2px; min-width: 0")}>
                        <span style={css("font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; font-weight: 400")}>
                          {r?.head}
                        </span>
                        <span style={css("font-size: 12px; color: #6B6C73; overflow: hidden; text-overflow: ellipsis")}>
                          {r?.text}
                        </span>
                      </span>
                    </span>
                    <span style={css("flex: 0 0 auto; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; color: #6B6C73")}>
                      {r?.to}
                    </span>
                  </button>
                </Fragment>
              ))}
              {v.ai?.empty ? (<>
                <p style={css("margin: 16px 10px; font-size: 13px; color: #6B6C73")}>
                  {v.i?.k72}
                </p>
              </>) : null}
            </div>
          </>) : null}
          {v.ai?.showJson ? (<>
            <div style={css("flex: 0 0 auto; display: flex; flex-direction: column; gap: 8px; padding: 10px 14px; border-bottom: 1px solid #EEEFF2")}>
              <p style={css("margin: 0; font-size: 12.5px; line-height: 1.45; color: #6B6C73")}>
                {v.ai?.fileNote}
              </p>
              <div style={css("display: flex; gap: 6px")}>
                <button className="wb-primary" type="button" onClick={v.ai?.download} style={css("height: 32px; background: #F3F4F6; color: #111114")}>
                  {v.ai?.downloadLabel}
                </button>
                <button className="wb-primary" type="button" aria-expanded={v.ai?.importExpanded} onClick={v.ai?.toggleImport} style={css("height: 32px; background: #F3F4F6; color: #111114")}>
                  {v.ai?.importLabel}
                </button>
              </div>
              {v.ai?.importOpen ? (<>
                <form onSubmit={v.ai?.doImport} style={css("display: flex; flex-direction: column; gap: 8px")}>
                  <label htmlFor="wb-import" className="wb-sr">
                    {v.ai?.importPh}
                  </label>
                  <textarea id="wb-import" className="wb-field" data-pop="1" rows={5} placeholder={v.ai?.importPh} value={v.ai?.importText} onChange={v.ai?.onImport} style={css("resize: none; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px")} />
                  {v.ai?.importError ? (<>
                    <p role="alert" style={css("margin: 0; font-size: 13px; color: #B42318")}>
                      {v.ai?.importErrorText}
                    </p>
                  </>) : null}
                  <button className="wb-primary" type="submit" style={css(v.ai?.loadStyle)}>
                    {v.ai?.loadLabel}
                  </button>
                </form>
              </>) : null}
            </div>
            <pre style={css("flex: 1 1 auto; margin: 0; padding: 12px 14px; overflow: auto; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11.5px; line-height: 1.55; color: #111114; white-space: pre; user-select: text")}>
              {v.ai?.json}
            </pre>
          </>) : null}
        </aside>
      </>) : null}
      {v.emptyHint ? (<>
        <div style={css("position: absolute; left: 0; right: 0; top: 40%; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 0 16px; text-align: center; pointer-events: none")}>
          <p style={css("margin: 0; font-size: 20px; color: #111114")}>
            {v.i?.k73}
          </p>
          <p style={css("margin: 0; font-size: 14px; line-height: 1.5; color: #6B6C73")}>
            {v.i?.k74}
          </p>
        </div>
      </>) : null}
      {v.hasHint ? (<>
        <div style={css("position: absolute; top: 20px; left: 50%; transform: translateX(-50%); padding: 8px 14px; border-radius: 999px; background: #111114; color: #FFFFFF; font-size: 13px; font-weight: 400; pointer-events: none; white-space: nowrap")}>
          {v.hint}
        </div>
      </>) : null}
      {v.mc?.show ? (<>
        <div className="wb-bar" role="toolbar" aria-label={v.i?.k8} style={css(v.mc?.style)}>
          <span style={css("padding: 0 10px; font-size: 14px; color: #111114")}>
            {v.mc?.count}
          </span>
          <span className="wb-sep" aria-hidden="true" />
          <button className="wb-btn wb-tip" type="button" data-tip={v.mc?.groupTip} onClick={v.mc?.toggleGroup} style={css("height: 40px; padding: 0 12px; font-size: 14px")}>
            {v.mc?.groupLabel}
          </button>
          <button className="wb-btn wb-tip" type="button" data-tip={v.i?.k9} onClick={v.mc?.tidy} style={css("height: 40px; padding: 0 12px; font-size: 14px")}>
            {v.i?.k75}
          </button>
          <button className="wb-btn wb-tip" type="button" data-tip={v.mc?.saveTip} onClick={v.mc?.saveLib} style={css("height: 40px; padding: 0 12px; font-size: 14px")}>
            {v.mc?.saveLabel}
          </button>
          <span className="wb-sep" aria-hidden="true" />
          <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.i?.k10} aria-label={v.i?.k10} onClick={v.mc?.duplicate}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
              <rect x="8" y="8" width="12" height="12" rx="2.5" />
              <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
            </svg>
          </button>
          <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.i?.k11} aria-label={v.i?.k11} onClick={v.mc?.remove} style={css("color: #B42318")}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 7h15" />
              <path d="M9.5 7V4.5h5V7" />
              <path d="M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" />
            </svg>
          </button>
        </div>
      </>) : null}
      {v.c?.show ? (<>
        <div className="wb-bar" role="toolbar" aria-label={v.i?.k8} style={css(v.c?.style)}>
          {v.c?.typeIcon ? (<>
            <span aria-hidden="true" style={css("width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #2A2B30")}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M5 5h14M12 5v15" />
              </svg>
            </span>
            <span className="wb-sep" aria-hidden="true" />
          </>) : null}
          {v.c?.node ? (<>
            <span style={css("padding: 0 8px 0 10px; font-size: 14px; color: #111114")}>
              {v.c?.nodeLabel}
            </span>
            <span className="wb-sep" aria-hidden="true" />
            {v.c?.canRun ? (<>
              <button className="wb-btn wb-tip" type="button" data-tip={v.i?.k1} aria-label={v.i?.k1} onClick={v.c?.runNode} style={css("height: 40px; padding: 0 12px 0 10px; gap: 6px; font-size: 14px")}>
                <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
                <span>
                  {v.i?.k76}
                </span>
              </button>
            </>) : null}
            {v.c?.node ? (<>
              <button className="wb-btn wb-tip" type="button" data-tip={v.c?.inspectTip} aria-label={v.c?.inspectTip} aria-pressed={v.c?.inspecting} onClick={v.c?.inspect} style={css(v.c?.inspectStyle)}>
                {v.c?.inspectLabel}
              </button>
            </>) : null}
            {v.c?.canOpt ? (<>
              <button className="wb-btn wb-tip" type="button" data-tip={v.c?.optTip} aria-label={v.c?.optTip} onClick={v.c?.makeOpts} style={css("height: 40px; padding: 0 12px; font-size: 14px")}>
                {v.c?.optLabel}
              </button>
            </>) : null}
            {v.c?.canEdit ? (<>
              <button className="wb-btn wb-tip" type="button" data-tip={v.i?.k12} aria-label={v.i?.k13} onClick={v.c?.editNode} style={css("height: 40px; padding: 0 12px; font-size: 14px")}>
                {v.i?.k13}
              </button>
            </>) : null}
          </>) : null}
          {v.c?.fillFirst ? (<>
            <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.i?.k14} aria-label={v.i?.k14} aria-expanded={v.c?.fillOpen} onClick={v.c?.openFill}>
              <span style={css(v.c?.fillDot)} />
            </button>
          </>) : null}
          {v.c?.format ? (<>
            <button className="wb-btn wb-tip" type="button" data-tip={v.i?.k15} aria-label={v.i?.k15} aria-expanded={v.c?.styleOpen} onClick={v.c?.openStyle} style={css("height: 40px; padding: 0 12px; font-size: 16px; font-weight: 400; gap: 6px")}>
              <span>
                {v.c?.styleLabel}
              </span>
            </button>
            {v.c?.textColor ? (<>
              <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.i?.k16} aria-label={v.i?.k16} aria-expanded={v.c?.textColorOpen} onClick={v.c?.openTextColor}>
                <span style={css(v.c?.textColorDot)}>
                  T
                </span>
              </button>
            </>) : null}
            <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.i?.k17} aria-label={v.i?.k17} aria-pressed={v.c?.boldPressed} onClick={v.c?.toggleBold} style={css(v.c?.boldStyle)}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                <path d="M7 4h6a4 4 0 0 1 0 8H7zM7 12h7a4 4 0 0 1 0 8H7z" />
              </svg>
            </button>
            <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.i?.k18} aria-label={v.i?.k18} aria-pressed={v.c?.italicPressed} onClick={v.c?.toggleItalic} style={css(v.c?.italicStyle)}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M10 4h8M6 20h8M14.5 4l-5 16" />
              </svg>
            </button>
            {v.c?.link ? (<>
              <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.i?.k19} aria-label={v.i?.k19} aria-expanded={v.c?.linkOpen} onClick={v.c?.openLink} style={css(v.c?.linkStyle)}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                </svg>
              </button>
            </>) : null}
            <span className="wb-sep" aria-hidden="true" />
            {v.c?.list ? (<>
              <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.i?.k20} aria-label={v.i?.k20} aria-pressed={v.c?.listPressed} onClick={v.c?.toggleList} style={css(v.c?.listStyle)}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M9.5 6h10.5M9.5 12h10.5M9.5 18h10.5" />
                  <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth="2.6" />
                </svg>
              </button>
            </>) : null}
            <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.c?.alignTip} aria-label={v.c?.alignTip} onClick={v.c?.cycleAlign}>
              {v.c?.alignLeft ? (<>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M4 6h16M4 12h10M4 18h14" />
                </svg>
              </>) : null}
              {v.c?.alignCenter ? (<>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M4 6h16M7 12h10M5 18h14" />
                </svg>
              </>) : null}
              {v.c?.alignRight ? (<>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M4 6h16M10 12h10M6 18h14" />
                </svg>
              </>) : null}
            </button>
          </>) : null}
          {v.c?.fillAfter ? (<>
            <span className="wb-sep" aria-hidden="true" />
            <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.i?.k14} aria-label={v.i?.k21} aria-expanded={v.c?.fillOpen} onClick={v.c?.openFill}>
              <span style={css(v.c?.fillDot)} />
            </button>
          </>) : null}
          {v.c?.arrow ? (<>
            <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.c?.dashTip} aria-label={v.c?.dashTip} onClick={v.c?.toggleDash}>
              {v.c?.dashed ? (<>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3.5 12h3M10.5 12h3M17.5 12h3" />
                </svg>
              </>) : null}
              {v.c?.solid ? (<>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 12h16" />
                </svg>
              </>) : null}
            </button>
          </>) : null}
          {v.c?.weight ? (<>
            <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.i?.k22} aria-label={v.i?.k22} aria-expanded={v.c?.weightOpen} onClick={v.c?.openWeight}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 5h16M4 10h16M5.5 14.5h13a2.5 2.5 0 0 1 0 5h-13a2.5 2.5 0 0 1 0-5z" />
              </svg>
            </button>
          </>) : null}
          {v.c?.arrow ? (<>
            <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.i?.k23} aria-label={v.i?.k23} aria-pressed={v.c?.headPressed} onClick={v.c?.toggleHead}>
              {v.c?.headOn ? (<>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12h15M14 7l5 5-5 5" />
                </svg>
              </>) : null}
              {v.c?.headOff ? (<>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M4 12h16" />
                </svg>
              </>) : null}
            </button>
            <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.i?.k14} aria-label={v.i?.k24} aria-expanded={v.c?.fillOpen} onClick={v.c?.openFill}>
              <span style={css(v.c?.fillDot)} />
            </button>
          </>) : null}
          {v.c?.lock ? (<>
            <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.c?.lockLabel} aria-label={v.c?.lockLabel} aria-pressed={v.c?.lockPressed} onClick={v.c?.toggleLock} style={css(v.c?.lockStyle)}>
              {v.c?.locked ? (<>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.5 11V8a4.5 4.5 0 0 1 9 0v3" />
                  <rect x="5.5" y="11" width="13" height="9.5" rx="2.5" />
                  <path d="M12 14.5v2.5" />
                </svg>
              </>) : null}
              {v.c?.unlocked ? (<>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.5 11V8a4.5 4.5 0 0 1 8.7-1.6" />
                  <rect x="5.5" y="11" width="13" height="9.5" rx="2.5" />
                  <path d="M12 14.5v2.5" />
                </svg>
              </>) : null}
            </button>
          </>) : null}
          <span className="wb-sep" aria-hidden="true" />
          <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.i?.k25} aria-label={v.i?.k25} aria-expanded={v.c?.commentOpen} onClick={v.c?.openComment}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.6A7.5 7.5 0 1 1 20 11.5z" />
            </svg>
          </button>
          <button className="wb-btn wb-cbtn wb-tip" type="button" data-tip={v.i?.k26} aria-label={v.i?.k26} aria-expanded={v.c?.moreOpen} onClick={v.c?.openMore} style={css(v.c?.moreStyle)}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
              <path d="M5.5 12h.01M12 12h.01M18.5 12h.01" />
            </svg>
          </button>
          {v.c?.popStyle ? (<>
            <div className="wb-pop" role="menu" aria-label={v.i?.k15} style={css("width: 200px")}>
              {(v.c?.styleOpts || []).map((o: any, i0: number) => (
                <Fragment key={i0}>
                  <button className="wb-menu-item" type="button" role="menuitemradio" aria-checked={o?.checked} onClick={o?.pick}>
                    <span style={css(o?.preview)}>
                      {o?.label}
                    </span>
                    {o?.on ? (<>
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={v.accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </>) : null}
                  </button>
                </Fragment>
              ))}
            </div>
          </>) : null}
          {v.c?.popSwatch ? (<>
            <div className="wb-pop" role="menu" aria-label={v.i?.k27} style={css("display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; width: 184px; padding: 8px")}>
              {(v.c?.swatchOpts || []).map((o: any, i0: number) => (
                <Fragment key={i0}>
                  <button className="wb-btn wb-tip" type="button" data-tip={o?.label} aria-label={o?.label} aria-pressed={o?.pressed} onClick={o?.pick} style={css("width: 40px; height: 40px")}>
                    <span style={css(o?.dot)} />
                  </button>
                </Fragment>
              ))}
            </div>
          </>) : null}
          {v.c?.popWeight ? (<>
            <div className="wb-pop" role="menu" aria-label={v.i?.k22} style={css("width: 180px")}>
              {(v.c?.weightOpts || []).map((o: any, i0: number) => (
                <Fragment key={i0}>
                  <button className="wb-menu-item" type="button" role="menuitemradio" aria-checked={o?.checked} onClick={o?.pick}>
                    <span style={css("display: flex; align-items: center; gap: 12px")}>
                      <span style={css(o?.preview)} />
                      <span>
                        {o?.label}
                      </span>
                    </span>
                    {o?.on ? (<>
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={v.accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </>) : null}
                  </button>
                </Fragment>
              ))}
            </div>
          </>) : null}
          {v.c?.popLink ? (<>
            <form className="wb-pop" onSubmit={v.c?.applyLink} style={css("width: 300px; padding: 12px; display: flex; flex-direction: column; gap: 10px")}>
              <label htmlFor="wb-link" style={css("font-size: 13px; font-weight: 400; color: #3A3B40")}>
                {v.i?.k19}
              </label>
              <input id="wb-link" className="wb-field" type="url" data-pop="1" placeholder={v.i?.k28} autoFocus={true} value={v.c?.linkDraft} onChange={v.c?.onLinkDraft} />
              <div style={css("display: flex; justify-content: flex-end; gap: 8px")}>
                {v.c?.hasLink ? (<>
                  <button className="wb-primary" type="button" onClick={v.c?.removeLink} style={css("background: #F3F4F6; color: #111114")}>
                    {v.i?.k77}
                  </button>
                </>) : null}
                <button className="wb-primary" type="submit" style={css(v.c?.applyStyle)}>
                  {v.i?.k78}
                </button>
              </div>
            </form>
          </>) : null}
          {v.c?.popComment ? (<>
            <form className="wb-pop" onSubmit={v.c?.postComment} style={css("width: 300px; padding: 12px; display: flex; flex-direction: column; gap: 10px")}>
              {(v.c?.comments || []).map((cm: any, i0: number) => (
                <Fragment key={i0}>
                  <div style={css("display: flex; gap: 10px; align-items: flex-start")}>
                    <span aria-hidden="true" style={css("flex: 0 0 auto; width: 26px; height: 26px; border-radius: 50%; background: #D4537E; color: #FFFFFF; font-size: 12px; font-weight: 400; display: flex; align-items: center; justify-content: center")}>
                      Y
                    </span>
                    <p style={css("margin: 3px 0 0; font-size: 14px; line-height: 1.45; color: #111114; overflow-wrap: anywhere")}>
                      {cm?.text}
                    </p>
                  </div>
                </Fragment>
              ))}
              <label htmlFor="wb-comment" className="wb-sr">
                {v.i?.k29}
              </label>
              <textarea id="wb-comment" className="wb-field" data-pop="1" rows={3} placeholder={v.i?.k29} autoFocus={true} value={v.c?.commentDraft} onChange={v.c?.onCommentDraft} style={css("resize: none")} />
              <div style={css("display: flex; justify-content: flex-end")}>
                <button className="wb-primary" type="submit" disabled={v.c?.postDisabled} style={css(v.c?.postStyle)}>
                  {v.i?.k79}
                </button>
              </div>
            </form>
          </>) : null}
          {v.c?.popMore ? (<>
            <div className="wb-pop" role="menu" aria-label={v.i?.k26} style={css("width: 220px; left: auto; right: 0; transform: none")}>
              <button className="wb-menu-item" type="button" role="menuitem" onClick={v.c?.duplicate}>
                <span>
                  {v.i?.k10}
                </span>
                <span className="wb-kbd">
                  Ctrl D
                </span>
              </button>
              <button className="wb-menu-item" type="button" role="menuitem" onClick={v.c?.front}>
                <span>
                  {v.i?.k80}
                </span>
              </button>
              <button className="wb-menu-item" type="button" role="menuitem" onClick={v.c?.back}>
                <span>
                  {v.i?.k81}
                </span>
              </button>
              <button className="wb-menu-item" type="button" role="menuitem" onClick={v.c?.toggleLock}>
                <span>
                  {v.c?.lockLabel}
                </span>
              </button>
              <div aria-hidden="true" style={css("height: 1px; background: #EEEFF2; margin: 4px 6px")} />
              <button className="wb-menu-item" type="button" role="menuitem" onClick={v.c?.remove} style={css("color: #B42318")}>
                <span>
                  {v.i?.k11}
                </span>
                <span className="wb-kbd">
                  Del
                </span>
              </button>
            </div>
          </>) : null}
        </div>
      </>) : null}
      {v.m?.show ? (<>
        <div className="wb-bar wb-cmenu" role="menu" aria-label={v.m?.label} onContextMenu={v.m?.block} onPointerDown={v.m?.stop} style={css(v.m?.style)}>
          {(v.m?.rows || []).map((r: any, i0: number) => (
            <Fragment key={i0}>
              {r?.sep ? (<>
                <div aria-hidden="true" style={css("height: 1px; background: #E3E4E8; margin: 6px 14px")} />
              </>) : null}
              {r?.item ? (<>
                <button className="wb-menu-item" type="button" role="menuitem" disabled={r?.disabled} onClick={r?.pick} style={css(r?.style)}>
                  <span>
                    {r?.label}
                  </span>
                  <span className="wb-kbd" style={css(r?.kbdStyle)}>
                    {r?.kbd}
                  </span>
                </button>
              </>) : null}
            </Fragment>
          ))}
        </div>
      </>) : null}
      <div style={css("position: absolute; right: 16px; bottom: 20px; z-index: 3; display: flex; flex-direction: column; align-items: flex-end; gap: 8px")}>
        {v.bgMenu ? (<>
          <div className="wb-bar wb-rise" role="menu" aria-label={v.i?.k30} style={css("width: 248px; box-sizing: border-box; padding: 12px; border-radius: 14px; display: flex; flex-direction: column; gap: 10px")}>
            <p style={css("margin: 0 2px; font-size: 12px; font-weight: 400; color: #6B6C73; text-transform: uppercase; letter-spacing: 0.04em")}>
              {v.i?.k82}
            </p>
            <div style={css("display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px")}>
              {(v.bgOpts || []).map((o: any, i0: number) => (
                <Fragment key={i0}>
                  <button className="wb-btn" type="button" role="menuitemradio" aria-checked={o?.checked} onClick={o?.pick} style={css(o?.style)}>
                    {o?.isGrid ? (<>
                      <span aria-hidden="true" style={css("display: block; width: 100%; height: 52px; border-radius: 8px; background-color: #FCFCFD; background-image: linear-gradient(#E6E7EB 1px, transparent 1px), linear-gradient(90deg, #E6E7EB 1px, transparent 1px); background-size: 13px 13px; background-position: 6px 6px")} />
                    </>) : null}
                    {o?.isDots ? (<>
                      <span aria-hidden="true" style={css("display: block; width: 100%; height: 52px; border-radius: 8px; background-color: #FCFCFD; background-image: radial-gradient(circle at 1.5px 1.5px, #C4C6CD 1.5px, transparent 2px); background-size: 13px 13px; background-position: 5px 5px")} />
                    </>) : null}
                    <span style={css("font-size: 13px; font-weight: 400")}>
                      {o?.label}
                    </span>
                  </button>
                </Fragment>
              ))}
            </div>
            <div aria-hidden="true" style={css("height: 1px; background: #EEEFF2")} />
            <button className="wb-menu-item" type="button" role="menuitemcheckbox" aria-checked={v.snapChecked} onClick={v.toggleSnap} style={css("padding: 0 4px")}>
              <span style={css("display: flex; flex-direction: column; gap: 2px")}>
                <span style={css("font-weight: 400")}>
                  {v.i?.k83}
                </span>
                <span style={css("font-size: 12px; color: #6B6C73")}>
                  {v.i?.k84}
                </span>
              </span>
              <span style={css(v.snapTrack)}>
                <span style={css(v.snapKnob)} />
              </span>
            </button>
          </div>
        </>) : null}
        {v.zoomMenu ? (<>
          <div className="wb-bar wb-rise" role="menu" aria-label={v.i?.k31} style={css("width: 200px; box-sizing: border-box; padding: 6px; border-radius: 12px")}>
            <button className="wb-menu-item" type="button" role="menuitem" onClick={v.zoomIn}>
              <span>
                {v.i?.k37}
              </span>
              <span className="wb-kbd">
                +
              </span>
            </button>
            <button className="wb-menu-item" type="button" role="menuitem" onClick={v.zoomOut}>
              <span>
                {v.i?.k34}
              </span>
              <span className="wb-kbd">
                −
              </span>
            </button>
            <button className="wb-menu-item" type="button" role="menuitem" onClick={v.zoomFit}>
              <span>
                {v.i?.k85}
              </span>
              <span className="wb-kbd">
                Shift 1
              </span>
            </button>
            <button className="wb-menu-item" type="button" role="menuitem" onClick={v.zoomReset}>
              <span>
                {v.i?.k86}
              </span>
              <span className="wb-kbd">
                0
              </span>
            </button>
          </div>
        </>) : null}
        <div className="wb-bar" role="group" aria-label={v.i?.k32} style={css("display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: 16px")}>
          <button className="wb-btn wb-dock wb-tip" type="button" data-tip={v.i?.k30} aria-label={v.i?.k30} aria-expanded={v.bgExpanded} onClick={v.toggleBgMenu} style={css(v.viewBtn)}>
            {v.bgIsGrid ? (<>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <path d="M9.5 4v16M14.5 4v16M4 9.5h16M4 14.5h16" />
              </svg>
            </>) : null}
            {v.bgIsDots ? (<>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 6h.01M12 6h.01M18 6h.01M6 12h.01M12 12h.01M18 12h.01M6 18h.01M12 18h.01M18 18h.01" />
              </svg>
            </>) : null}
          </button>
          <span aria-hidden="true" style={css("width: 1px; height: 18px; background: #DCDDE2; margin: 0 3px")} />
          <button className="wb-btn wb-dock wb-tip" type="button" data-tip={v.i?.k33} aria-label={v.i?.k34} onClick={v.zoomOut} style={css("width: 30px; height: 38px; border-radius: 11px")}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 12h12" />
            </svg>
          </button>
          <button className="wb-btn wb-dock wb-tip" type="button" data-tip={v.i?.k35} aria-label={v.i?.k35} aria-expanded={v.zoomExpanded} onClick={v.toggleZoomMenu} style={css("width: 50px; height: 38px; border-radius: 11px; font-size: 13.5px; font-variant-numeric: tabular-nums")}>
            {v.zoomLabel}
          </button>
          <button className="wb-btn wb-dock wb-tip" type="button" data-tip={v.i?.k36} aria-label={v.i?.k37} onClick={v.zoomIn} style={css("width: 30px; height: 38px; border-radius: 11px")}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 12h12M12 6v12" />
            </svg>
          </button>
          <span aria-hidden="true" style={css("width: 1px; height: 18px; background: #DCDDE2; margin: 0 3px")} />
          <button className="wb-btn wb-dock wb-tip" type="button" data-tip={v.help?.tip} aria-label={v.help?.tip} aria-expanded={v.help?.expanded} onClick={v.help?.toggle} style={css("width: 30px; height: 38px; border-radius: 11px; font-size: 15px")}>
            ?
          </button>
        </div>
      </div>
      <div className="wb-bar" role="group" aria-label={v.i?.k38} style={css("position: absolute; left: 16px; bottom: 20px; z-index: 3; display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: 16px")}>
        <button className="wb-btn wb-dock wb-tip" type="button" data-tip={v.i?.k39} aria-label={v.i?.k40} disabled={v.undoDisabled} onClick={v.undo} style={css(v.undoStyle)}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 5.5L4.5 9.5l4 4" />
            <path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3" />
          </svg>
        </button>
        <button className="wb-btn wb-dock wb-tip" type="button" data-tip={v.i?.k41} aria-label={v.i?.k42} disabled={v.redoDisabled} onClick={v.redo} style={css(v.redoStyle)}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.5 5.5l4 4-4 4" />
            <path d="M19.5 9.5H10a5.5 5.5 0 0 0 0 11h3" />
          </svg>
        </button>
      </div>
      <div style={css("position: absolute; left: 0; right: 0; bottom: 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 0 16px; pointer-events: none")}>
        {v.ca?.show ? (<>
          <div className="wb-bar wb-rise" style={css("pointer-events: auto; width: 100%; max-width: 520px; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border-radius: 16px")}>
            <div style={css("display: flex; align-items: center; gap: 8px")}>
              {v.ca?.busy ? (<>
                <span aria-hidden="true" style={css(v.ca?.spin)} />
              </>) : null}
              {v.ca?.done ? (<>
                <span aria-hidden="true" style={css(v.ca?.tick)} />
              </>) : null}
              <span style={css("flex: 1 1 auto; min-width: 0; font-size: 13.5px; color: #111114; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                {v.ca?.title}
              </span>
              <span style={css("font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; flex: 0 0 auto; font-size: 11.5px; color: #6B6C73")}>
                {v.ca?.count}
              </span>
              {v.ca?.busy ? (<>
                <button className="wb-primary" type="button" onClick={v.ca?.stop} style={css("flex: 0 0 auto; height: 28px; padding: 0 10px; font-size: 12.5px; background: #F3F4F6; color: #111114")}>
                  {v.ca?.stopLabel}
                </button>
              </>) : null}
            </div>
            <p style={css("margin: 0; font-size: 13px; line-height: 1.4; color: #3A3B40; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical")}>
              {v.ca?.ask?.text}
            </p>
            {v.ca?.hasMore ? (<>
              <span style={css("font-size: 12px; color: #6B6C73")}>
                {v.ca?.more}
              </span>
            </>) : null}
            <ol role="log" aria-live="polite" style={css("margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px")}>
              {v.ca?.waiting ? (<>
                <li style={css("font-size: 13px; color: #6B6C73")}>
                  {v.ca?.waitText}
                </li>
              </>) : null}
              {(v.ca?.rows || []).map((cr: any, i0: number) => (
                <Fragment key={i0}>
                  <li style={css("display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 5px 9px; border-radius: 9px; background: #F6F6F8")}>
                    <span style={css("min-width: 0; font-size: 13px; line-height: 1.35; color: #111114; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                      {cr?.line}
                    </span>
                    <span style={css("font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; flex: 0 0 auto; font-size: 11px; color: #6B6C73")}>
                      {cr?.tool}
                    </span>
                  </li>
                </Fragment>
              ))}
            </ol>
            <span style={css("font-size: 12px; line-height: 1.4; color: #6B6C73")}>
              {v.ca?.foot}
            </span>
          </div>
        </>) : null}
        {v.pp?.show ? (<>
          <div className="wb-bar wb-rise" role="status" style={css("pointer-events: auto; max-width: 100%; box-sizing: border-box; display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 14px; border-radius: 16px")}>
            <span aria-hidden="true" style={css(v.pp?.dot)} />
            <span style={css("min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; color: #111114")}>
              {v.pp?.note}
            </span>
            <button className="wb-primary" type="button" onClick={v.pp?.reject} style={css("background: #F3F4F6; color: #111114")}>
              {v.i?.k87}
            </button>
            <button className="wb-primary" type="button" onClick={v.pp?.accept} style={css(v.pp?.acceptStyle)}>
              {v.i?.k88}
            </button>
          </div>
        </>) : null}
        <div id="wb-prompt-bar" aria-hidden={v.promptHidden} style={css(v.promptWrapStyle)}>
          <form onSubmit={v.onSubmit} style={css(v.promptFormStyle)}>
            <label htmlFor="wb-prompt" className="wb-sr">
              {v.i?.k89}
            </label>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={v.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={css("flex: 0 0 auto")}>
              <path d="M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9z" />
              <path d="M18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z" />
            </svg>
            <input id="wb-prompt" className="wb-input" type="text" autoComplete="off" placeholder={v.placeholder} ref={v.inputRef} value={v.prompt} onChange={v.onPrompt} style={css("flex: 1 1 auto; min-width: 0; height: 40px; border: 0; background: transparent; font: inherit; font-size: 16px; color: #111114")} />
            <button className="wb-btn" type="button" aria-label={v.micLabel} aria-pressed={v.micPressed} onClick={v.toggleMic} style={css(v.micStyle)}>
              <span aria-hidden="true" style={css(v.stkSm)}>
                {(v.dock?.mic || []).map((L: any, i0: number) => (
                  <Fragment key={i0}>
                    <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                      <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                    </svg>
                  </Fragment>
                ))}
              </span>
            </button>
            <button className="wb-send" type="submit" aria-label={v.i?.k43} disabled={v.sendDisabled} style={css(v.sendStyle)}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5" />
                <path d="M6 11l6-6 6 6" />
              </svg>
            </button>
          </form>
          <div style={css("margin: 8px 0 0; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; font-size: 12px; color: #6B6C73")}>
            <span>
              {v.cmode?.pre}
            </span>
            <button className="wb-btn" type="button" title={v.cmode?.tip} aria-label={v.cmode?.tip} onClick={v.cmode?.cycle} style={css(v.cmode?.style)}>
              {v.cmode?.label}
            </button>
            <span aria-hidden="true">
              ·
            </span>
            <span>
              {v.i?.k90}
            </span>
          </div>
        </div>
        {v.showNodes ? (<>
          <div className="wb-bar wb-rise" role="dialog" aria-label={v.i?.k44} style={css("pointer-events: auto; width: 580px; max-width: 100%; max-height: 60vh; overflow: auto; box-sizing: border-box; padding: 14px; border-radius: 18px; display: flex; flex-direction: column; gap: 12px")}>
            {(v.nodeCats || []).map((cg: any, i0: number) => (
              <Fragment key={i0}>
                <div style={css("display: flex; flex-direction: column; gap: 6px")}>
                  <p style={css("margin: 0 6px; display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px")}>
                    <span style={css("font-size: 12px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.04em; color: #3A3B40")}>
                      {cg?.label}
                    </span>
                    <span style={css("font-size: 12px; color: #6B6C73")}>
                      {cg?.hint}
                    </span>
                  </p>
                  <div style={css("display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px")}>
                    {(cg?.types || []).map((nt: any, i2: number) => (
                      <Fragment key={i2}>
                        <div style={css("position: relative; min-width: 0")}>
                          <button className="wb-node-btn" type="button" onClick={nt?.pick} style={css(nt?.style)}>
                            <span aria-hidden="true" style={css(v.stkLib)}>
                              {(nt?.stk || []).map((L: any, i4: number) => (
                                <Fragment key={i4}>
                                  <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                                    <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                                  </svg>
                                </Fragment>
                              ))}
                            </span>
                            <span style={css("overflow: hidden; text-overflow: ellipsis")}>
                              {nt?.label}
                            </span>
                          </button>
                          {nt?.canPin ? (<>
                            <button className="wb-btn" type="button" title={nt?.pinTip} aria-label={nt?.pinTip} aria-pressed={nt?.pinPressed} onClick={nt?.togglePin} style={css(nt?.pinStyle)}>
                              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill={nt?.pinFill} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 3.5h6l-1 6 3.5 3.5v1.5h-11V13L10 9.500z" />
                                <path d="M12 14.500V21" fill="none" />
                              </svg>
                            </button>
                          </>) : null}
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </Fragment>
            ))}
            <div style={css("display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding-top: 10px; border-top: 1px solid #EEEFF2")}>
              <button className="wb-primary" type="button" onClick={v.lib?.openMarket} style={css(v.lib?.marketStyle)}>
                {v.lib?.marketLabel}
              </button>
              {v.lib?.has ? (<>
                <button className="wb-primary" type="button" onClick={v.lib?.clear} style={css("height: 36px; background: transparent; color: #6B6C73")}>
                  {v.lib?.clearLabel}
                </button>
              </>) : null}
              <span style={css("flex: 1 1 160px; font-size: 12.5px; line-height: 1.4; color: #6B6C73")}>
                {v.lib?.hint}
              </span>
            </div>
          </div>
        </>) : null}
        {v.showShapes ? (<>
          <div className="wb-bar wb-rise" role="menu" aria-label={v.i?.k45} style={css("pointer-events: auto; display: grid; grid-template-columns: repeat(5, 44px); gap: 8px; padding: 14px; border-radius: 18px")}>
            {(v.shapeOpts || []).map((o: any, i0: number) => (
              <Fragment key={i0}>
                <button className="wb-btn wb-tip" type="button" role="menuitemradio" data-tip={o?.label} aria-label={o?.label} aria-checked={o?.checked} onClick={o?.pick} style={css(o?.style)}>
                  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d={o?.icon} />
                  </svg>
                </button>
              </Fragment>
            ))}
          </div>
        </>) : null}
        {v.showStickers ? (<>
          <div className="wb-bar wb-rise" role="dialog" aria-label={v.i?.k46} style={css("pointer-events: auto; width: 448px; max-width: 100%; box-sizing: border-box; padding: 16px; border-radius: 20px; display: flex; flex-direction: column; gap: 14px")}>
            <div style={css("position: relative")}>
              <label htmlFor="wb-sticker-search" className="wb-sr">
                {v.i?.k47}
              </label>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6C73" strokeWidth="2" strokeLinecap="round" style={css("position: absolute; left: 14px; top: 13px")}>
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4 4" />
              </svg>
              <input id="wb-sticker-search" className="wb-input" type="text" autoComplete="off" placeholder={v.i?.k47} autoFocus={true} value={v.stickerQuery} onChange={v.onStickerQuery} style={css("width: 100%; box-sizing: border-box; height: 44px; padding: 0 14px 0 42px; border: 0; border-radius: 12px; background: #F3F4F6; font: inherit; font-size: 16px; color: #111114")} />
            </div>
            <div style={css("display: grid; grid-template-columns: repeat(7, 52px); gap: 6px; justify-content: center")}>
              {(v.stickerOpts || []).map((o: any, i0: number) => (
                <Fragment key={i0}>
                  <button className="wb-sticker wb-tip" type="button" data-tip={o?.name} aria-label={o?.name} onClick={o?.pick}>
                    <div style={css(o?.inner)}>
                      {(o?.layers || []).map((L: any, i2: number) => (
                        <Fragment key={i2}>
                          <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                            <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                          </svg>
                        </Fragment>
                      ))}
                    </div>
                  </button>
                </Fragment>
              ))}
            </div>
            {v.noStickers ? (<>
              <p style={css("margin: 0; text-align: center; font-size: 14px; color: #6B6C73")}>
                {v.i?.k91}
              </p>
            </>) : null}
          </div>
        </>) : null}
        {v.showDraw ? (<>
          <div className="wb-bar wb-rise" role="toolbar" aria-label={v.i?.k48} style={css("pointer-events: auto; display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: 14px")}>
            <button className="wb-btn wb-tip" type="button" data-tip={v.i?.k49} aria-label={v.i?.k50} aria-pressed={v.penPressed} onClick={v.setPen} style={css(v.penBtnStyle)}>
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.5 4.5l4 4L8 20H4v-4z" />
                <path d="M13.5 6.5l4 4" />
              </svg>
            </button>
            <button className="wb-btn wb-tip" type="button" data-tip={v.i?.k51} aria-label={v.i?.k52} aria-pressed={v.arrowPressed} onClick={v.setArrow} style={css(v.arrowBtnStyle)}>
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 19L19 5" />
                <path d="M9 5h10v10" />
              </svg>
            </button>
            <span className="wb-sep" aria-hidden="true" />
            {(v.inkOpts || []).map((o: any, i0: number) => (
              <Fragment key={i0}>
                <button className="wb-btn wb-tip" type="button" data-tip={o?.label} aria-label={`${o?.label} ink`} aria-pressed={o?.pressed} onClick={o?.pick} style={css(o?.style)}>
                  <span style={css(o?.dot)} />
                </button>
              </Fragment>
            ))}
          </div>
        </>) : null}
        <nav className="wb-bar" aria-label={v.i?.k53} style={css("pointer-events: auto; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 6px; padding: 6px; border-radius: 20px")}>
          <div role="group" aria-label={v.i?.k54} style={css(v.grp)}>
            {(v.toolsA || []).map((t: any, i0: number) => (
              <Fragment key={i0}>
                <button className="wb-btn wb-dock wb-tip" type="button" data-tip={t?.tip} aria-label={t?.label} aria-pressed={t?.pressed} onClick={t?.pick} style={css(t?.style)}>
                  <span aria-hidden="true" style={css(v.stkBox)}>
                    {(t?.stk || []).map((L: any, i2: number) => (
                      <Fragment key={i2}>
                        <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                          <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                        </svg>
                      </Fragment>
                    ))}
                  </span>
                </button>
              </Fragment>
            ))}
          </div>
          <div role="group" aria-label={v.i?.k55} style={css(v.grp)}>
            {(v.pinBtns || []).map((pb: any, i0: number) => (
              <Fragment key={i0}>
                <button className="wb-btn wb-dock wb-tip" type="button" data-tip={pb?.tip} aria-label={pb?.name} aria-pressed={pb?.pressed} onClick={pb?.pick} style={css(pb?.style)}>
                  <span aria-hidden="true" style={css(v.stkBox)}>
                    {(pb?.stk || []).map((L: any, i2: number) => (
                      <Fragment key={i2}>
                        <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                          <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                        </svg>
                      </Fragment>
                    ))}
                  </span>
                </button>
              </Fragment>
            ))}
            <button className="wb-btn wb-dock wb-tip" type="button" data-tip={v.nodeSlot?.tip} aria-label={v.i?.k56} aria-expanded={v.nodeSlot?.expanded} aria-pressed={v.nodeSlot?.pressed} onClick={v.nodeSlot?.pick} style={css(v.nodeSlot?.style)}>
              <span aria-hidden="true" style={css(v.stkBox)}>
                {(v.nodeSlot?.stk || []).map((L: any, i0: number) => (
                  <Fragment key={i0}>
                    <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                      <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                    </svg>
                  </Fragment>
                ))}
              </span>
            </button>
            {(v.toolsB || []).map((t: any, i0: number) => (
              <Fragment key={i0}>
                <button className="wb-btn wb-dock wb-tip" type="button" data-tip={t?.tip} aria-label={t?.label} aria-pressed={t?.pressed} onClick={t?.pick} style={css(t?.style)}>
                  <span aria-hidden="true" style={css(v.stkBox)}>
                    {(t?.stk || []).map((L: any, i2: number) => (
                      <Fragment key={i2}>
                        <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                          <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                        </svg>
                      </Fragment>
                    ))}
                  </span>
                </button>
              </Fragment>
            ))}
            <button className="wb-btn wb-dock wb-tip" type="button" data-tip={v.drawSlot?.tip} aria-label={v.drawSlot?.label} aria-pressed={v.drawSlot?.pressed} onClick={v.drawSlot?.pick} style={css(v.drawSlot?.style)}>
              <span aria-hidden="true" style={css(v.stkBox)}>
                {(v.drawSlot?.stk || []).map((L: any, i0: number) => (
                  <Fragment key={i0}>
                    <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                      <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                    </svg>
                  </Fragment>
                ))}
              </span>
            </button>
            <button className="wb-btn wb-dock wb-tip" type="button" data-tip={v.shapeSlot?.tip} aria-label={v.i?.k45} aria-expanded={v.shapeSlot?.expanded} aria-pressed={v.shapeSlot?.pressed} onClick={v.shapeSlot?.pick} style={css(v.shapeSlot?.style)}>
              <span aria-hidden="true" style={css(v.stkBox)}>
                {(v.shapeSlot?.stk || []).map((L: any, i0: number) => (
                  <Fragment key={i0}>
                    <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                      <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                    </svg>
                  </Fragment>
                ))}
              </span>
            </button>
            <button className="wb-btn wb-dock wb-tip" type="button" data-tip={v.stickerSlot?.tip} aria-label={v.i?.k46} aria-expanded={v.stickerSlot?.expanded} aria-pressed={v.stickerSlot?.pressed} onClick={v.stickerSlot?.pick} style={css(v.stickerSlot?.style)}>
              <span style={css(v.stickerSlot?.inner)}>
                {(v.stickerSlot?.layers || []).map((L: any, i0: number) => (
                  <Fragment key={i0}>
                    <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                      <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                    </svg>
                  </Fragment>
                ))}
              </span>
            </button>
          </div>
          <div role="group" aria-label={v.i?.k57} style={css("display: flex; align-items: center; gap: 4px; padding-left: 2px")}>
            <button className="wb-chat" type="button" title={v.i?.k58} aria-expanded={v.chatPressed} aria-controls="wb-prompt-bar" onClick={v.toggleChat} style={css(v.chatStyle)}>
              <span aria-hidden="true" style={css(v.stkSm)}>
                {(v.dock?.chat || []).map((L: any, i0: number) => (
                  <Fragment key={i0}>
                    <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                      <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                    </svg>
                  </Fragment>
                ))}
              </span>
              <span>
                {v.i?.k92}
              </span>
            </button>
            <button className="wb-primary" type="button" onClick={v.runToggle} style={css(v.runStyle)}>
              <span aria-hidden="true" style={css(v.stkSm)}>
                {(v.runStk || []).map((L: any, i0: number) => (
                  <Fragment key={i0}>
                    <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                      <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                    </svg>
                  </Fragment>
                ))}
              </span>
              <span style={css("font-variant-numeric: tabular-nums")}>
                {v.runLabel}
              </span>
            </button>
          </div>
        </nav>
      </div>
      {v.hzd?.show ? (<>
        <aside className="wb-bar" aria-label={v.hzd?.title} style={css("position: absolute; top: 72px; right: 16px; bottom: 130px; width: 320px; max-width: calc(100% - 32px); box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; padding: 16px; overflow: auto; z-index: 8; animation: wb-slide 220ms cubic-bezier(0.2, 0.8, 0.2, 1)")}>
          <div style={css("flex: 0 0 auto; display: flex; align-items: flex-start; justify-content: space-between; gap: 8px")}>
            <div style={css("display: flex; flex-direction: column; gap: 4px; min-width: 0")}>
              <h2 style={css("margin: 0; font-size: 17px; font-weight: 400")}>
                {v.hzd?.title}
              </h2>
              <p style={css("margin: 0; font-size: 13px; line-height: 1.45; color: #6B6C73")}>
                {v.hzd?.sub}
              </p>
            </div>
            <button className="wb-btn" type="button" aria-label={v.hzd?.closeLabel} onClick={v.hzd?.close} style={css("width: 32px; height: 32px")}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {v.hzd?.isBrowser ? (<>
            <div aria-hidden="true" style={css("flex: 0 0 auto; border: 1px solid #C9CBD2; border-radius: 10px; overflow: hidden")}>
              <div style={css("height: 22px; display: flex; align-items: center; gap: 4px; padding: 0 8px; background: #F0F1F4; border-bottom: 1px solid #E3E4E8")}>
                <span style={css("width: 6px; height: 6px; border-radius: 50%; background: #C9CBD2")} />
                <span style={css("width: 6px; height: 6px; border-radius: 50%; background: #C9CBD2")} />
                <span style={css("font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; margin-left: 6px; font-size: 10.5px; color: #6B6C73")}>
                  localhost:3000
                </span>
              </div>
              <div style={css("height: 116px; box-sizing: border-box; padding: 14px")}>
                {v.hzd?.isA ? (<>
                  <span style={css("display: flex; align-items: center; gap: 10px; height: 100%")}>
                    <span style={css("flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 6px")}>
                      <span style={css("display: block; width: 86%; height: 8px; border-radius: 3px; background: #111114")} />
                      <span style={css("display: block; width: 100%; height: 6px; border-radius: 3px; background: #D2D3D9")} />
                      <span style={css("display: block; width: 70%; height: 6px; border-radius: 3px; background: #D2D3D9")} />
                      <span style={css(`display: block; flex: 0 0 auto; width: 44px; height: 14px; border-radius: 7px; background: ${v.accent}`)} />
                    </span>
                    <span style={css("display: block; flex: 0 0 auto; width: 42%; height: 100%; border-radius: 6px; background: #DDEBFF")} />
                  </span>
                </>) : null}
                {v.hzd?.isB ? (<>
                  <span style={css("display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; height: 100%")}>
                    <span style={css("display: block; width: 62%; height: 8px; border-radius: 3px; background: #111114")} />
                    <span style={css("display: block; width: 78%; height: 6px; border-radius: 3px; background: #D2D3D9")} />
                    <span style={css("display: block; width: 50%; height: 6px; border-radius: 3px; background: #D2D3D9")} />
                    <span style={css(`display: block; flex: 0 0 auto; width: 44px; height: 14px; border-radius: 7px; background: ${v.accent}`)} />
                  </span>
                </>) : null}
                {v.hzd?.isC ? (<>
                  <span style={css("display: flex; flex-direction: column; gap: 7px; height: 100%")}>
                    <span style={css("display: block; flex: 0 0 auto; width: 100%; height: 52%; border-radius: 6px; background: #DDEBFF")} />
                    <span style={css("display: flex; align-items: center; justify-content: space-between; gap: 8px")}>
                      <span style={css("flex: 1 1 0; display: flex; flex-direction: column; gap: 5px")}>
                        <span style={css("display: block; width: 80%; height: 8px; border-radius: 3px; background: #111114")} />
                        <span style={css("display: block; width: 60%; height: 6px; border-radius: 3px; background: #D2D3D9")} />
                      </span>
                      <span style={css(`display: block; flex: 0 0 auto; width: 44px; height: 14px; border-radius: 7px; background: ${v.accent}`)} />
                    </span>
                  </span>
                </>) : null}
              </div>
            </div>
          </>) : null}
          {v.hzd?.isPhone ? (<>
            <div aria-hidden="true" style={css("flex: 0 0 auto; align-self: center; width: 116px; padding: 8px 6px 12px; border-radius: 18px; background: #2A2B30")}>
              <div style={css("height: 160px; box-sizing: border-box; padding: 10px; border-radius: 10px; background: #FFFFFF; display: flex; flex-direction: column; gap: 7px")}>
                <span style={css("display: block; height: 50px; border-radius: 6px; background: #DDEBFF")} />
                <span style={css("display: block; width: 70%; height: 8px; border-radius: 4px; background: #111114")} />
                <span style={css("display: block; width: 90%; height: 6px; border-radius: 3px; background: #D2D3D9")} />
                <span style={css("display: block; width: 60%; height: 6px; border-radius: 3px; background: #D2D3D9")} />
                <span style={css(`display: block; margin-top: auto; height: 20px; border-radius: 10px; background: ${v.accent}`)} />
              </div>
            </div>
          </>) : null}
          <ul style={css("flex: 0 0 auto; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px")}>
            {(v.hzd?.rows || []).map((rw: any, i0: number) => (
              <Fragment key={i0}>
                <li style={css("display: flex; align-items: baseline; gap: 8px; padding: 8px 10px; border: 1px solid #EEEFF2; border-radius: 10px")}>
                  <span style={css(rw?.tagStyle)}>
                    {rw?.tag}
                  </span>
                  <span style={css("display: flex; flex-direction: column; gap: 2px; min-width: 0")}>
                    <span style={css(rw?.lineStyle)}>
                      {rw?.line}
                    </span>
                    <span style={css("font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 11px; color: #6B6C73; overflow-wrap: anywhere")}>
                      {rw?.from}
                    </span>
                  </span>
                </li>
              </Fragment>
            ))}
          </ul>
          {v.hzd?.empty ? (<>
            <p style={css("margin: 0; font-size: 13.5px; color: #6B6C73")}>
              {v.hzd?.emptyText}
            </p>
          </>) : null}
        </aside>
      </>) : null}
      {v.cmpd?.open ? (<>
        <div style={css("position: absolute; inset: 0; z-index: 41; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(17,17,20,0.32)")} onPointerDown={v.cmpd?.close}>
          <div className="wb-bar" role="dialog" aria-label={v.cmpd?.title} onPointerDown={v.stopEv} style={css("width: 100%; max-width: 1040px; max-height: 100%; overflow: auto; box-sizing: border-box; padding: 22px; border-radius: 20px; display: flex; flex-direction: column; gap: 16px")}>
            <div style={css("display: flex; align-items: center; justify-content: space-between; gap: 8px")}>
              <h2 style={css("margin: 0; font-size: 19px; font-weight: 400")}>
                {v.cmpd?.title}
              </h2>
              <button className="wb-btn" type="button" aria-label={v.cmpd?.closeLabel} onClick={v.cmpd?.close} style={css("width: 36px; height: 36px")}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div style={css("display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px")}>
              {(v.cmpd?.cols || []).map((v: any, i0: number) => (
                <Fragment key={i0}>
                  <div style={css(v?.style)}>
                    <div aria-hidden="true" style={css("height: 190px; box-sizing: border-box; padding: 18px; border-radius: 12px; background: #FAFAFB; border: 1px solid #EEEFF2")}>
                      {v?.isA ? (<>
                        <span style={css("display: flex; align-items: center; gap: 20px; height: 100%")}>
                          <span style={css("flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 12px")}>
                            <span style={css("display: block; width: 86%; height: 16px; border-radius: 6px; background: #111114")} />
                            <span style={css("display: block; width: 100%; height: 12px; border-radius: 6px; background: #D2D3D9")} />
                            <span style={css("display: block; width: 70%; height: 12px; border-radius: 6px; background: #D2D3D9")} />
                            <span style={css(`display: block; flex: 0 0 auto; width: 88px; height: 28px; border-radius: 14px; background: ${v.accent}`)} />
                          </span>
                          <span style={css("display: block; flex: 0 0 auto; width: 42%; height: 100%; border-radius: 12px; background: #DDEBFF")} />
                        </span>
                      </>) : null}
                      {v?.isB ? (<>
                        <span style={css("display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; height: 100%")}>
                          <span style={css("display: block; width: 62%; height: 16px; border-radius: 6px; background: #111114")} />
                          <span style={css("display: block; width: 78%; height: 12px; border-radius: 6px; background: #D2D3D9")} />
                          <span style={css("display: block; width: 50%; height: 12px; border-radius: 6px; background: #D2D3D9")} />
                          <span style={css(`display: block; flex: 0 0 auto; width: 88px; height: 28px; border-radius: 14px; background: ${v.accent}`)} />
                        </span>
                      </>) : null}
                      {v?.isC ? (<>
                        <span style={css("display: flex; flex-direction: column; gap: 14px; height: 100%")}>
                          <span style={css("display: block; flex: 0 0 auto; width: 100%; height: 52%; border-radius: 12px; background: #DDEBFF")} />
                          <span style={css("display: flex; align-items: center; justify-content: space-between; gap: 16px")}>
                            <span style={css("flex: 1 1 0; display: flex; flex-direction: column; gap: 10px")}>
                              <span style={css("display: block; width: 80%; height: 16px; border-radius: 6px; background: #111114")} />
                              <span style={css("display: block; width: 60%; height: 12px; border-radius: 6px; background: #D2D3D9")} />
                            </span>
                            <span style={css(`display: block; flex: 0 0 auto; width: 88px; height: 28px; border-radius: 14px; background: ${v.accent}`)} />
                          </span>
                        </span>
                      </>) : null}
                    </div>
                    <div style={css("display: flex; align-items: center; justify-content: space-between; gap: 8px")}>
                      <span style={css("display: flex; flex-direction: column; gap: 2px; min-width: 0")}>
                        <span style={css("font-size: 15px")}>
                          {v?.title}
                        </span>
                        <span style={css("font-size: 12.5px; color: #6B6C73; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                          {v?.note}
                        </span>
                        <span style={css("font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 11.5px; color: #6B6C73")}>
                          {v?.sum}
                        </span>
                      </span>
                      <button className="wb-primary" type="button" onClick={v?.keep} style={css(v?.btn)}>
                        {v?.keepLabel}
                      </button>
                    </div>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </>) : null}
      {v.ins?.show ? (<>
        <aside className="wb-bar" aria-label={v.ins?.title} style={css("position: absolute; top: 72px; right: 16px; bottom: 130px; width: 340px; max-width: calc(100% - 32px); box-sizing: border-box; display: flex; flex-direction: column; gap: 14px; padding: 16px; overflow: auto; z-index: 8; animation: wb-slide 220ms cubic-bezier(0.2, 0.8, 0.2, 1)")}>
          <div style={css("flex: 0 0 auto; display: flex; align-items: flex-start; justify-content: space-between; gap: 8px")}>
            <div style={css("display: flex; flex-direction: column; gap: 4px; min-width: 0")}>
              <h2 style={css("margin: 0; font-size: 17px; font-weight: 400")}>
                {v.ins?.title}
              </h2>
              <p style={css("margin: 0; font-size: 13px; line-height: 1.45; color: #6B6C73")}>
                {v.ins?.where}
              </p>
            </div>
            <button className="wb-btn" type="button" aria-label={v.ins?.closeLabel} onClick={v.ins?.close} style={css("flex: 0 0 auto; width: 32px; height: 32px")}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {(v.ins?.groups || []).map((g: any, i0: number) => (
            <Fragment key={i0}>
              <div role="group" aria-label={g?.label} style={css("flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px")}>
                <span style={css("margin: 0; font-size: 12px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.04em; color: #6B6C73")}>
                  {g?.label}
                </span>
                <div style={css("display: flex; flex-wrap: wrap; gap: 6px")}>
                  {(g?.opts || []).map((op: any, i2: number) => (
                    <Fragment key={i2}>
                      <button className="wb-btn" type="button" aria-pressed={op?.pressed} onClick={op?.pick} style={css(op?.style)}>
                        {op?.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
            </Fragment>
          ))}
          {v.ins?.hasHint ? (<>
            <p style={css("flex: 0 0 auto; margin: 0; font-size: 13px; line-height: 1.45; color: #3A3B40")}>
              {v.ins?.hint}
            </p>
          </>) : null}
          <section style={css("flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px")}>
            <h3 style={css("margin: 0; font-size: 12px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.04em; color: #6B6C73")}>
              {v.ins?.inLabel}
            </h3>
            <div style={css(v.ins?.inStyle)}>
              {v.ins?.inText}
            </div>
          </section>
          <section style={css("flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px")}>
            <div style={css("display: flex; align-items: center; justify-content: space-between; gap: 8px")}>
              <h3 style={css("margin: 0; font-size: 12px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.04em; color: #6B6C73")}>
                {v.ins?.outLabel}
              </h3>
              <span style={css(v.ins?.badgeStyle)}>
                {v.ins?.badge}
              </span>
            </div>
            <div style={css(v.ins?.outStyle)}>
              {v.ins?.outText}
            </div>
            {v.ins?.canRun ? (<>
              <button className="wb-primary" type="button" onClick={v.ins?.run} style={css(`align-self: flex-start; height: 38px; padding: 0 14px; font-size: 13.5px; background: ${v.accent}; color: #FFFFFF`)}>
                {v.ins?.runLabel}
              </button>
            </>) : null}
          </section>
          {v.ins?.hasMap ? (<>
            <section style={css("flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px")}>
              <h3 style={css("margin: 0; font-size: 12px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.04em; color: #6B6C73")}>
                {v.ins?.mapLabel}
              </h3>
              <span style={css("font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 12px; color: #3A3B40; overflow-wrap: anywhere")}>
                {v.ins?.mapNote}
              </span>
              <ul style={css("margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px")}>
                {(v.ins?.maps || []).map((mp: any, i0: number) => (
                  <Fragment key={i0}>
                    <li style={css("display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 6px 10px; border: 1px solid #EEEFF2; border-radius: 9px")}>
                      <span style={css("font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 12px; color: #111114; overflow-wrap: anywhere; min-width: 0")}>
                        {mp?.from}
                      </span>
                      <span style={css("flex: 0 0 auto; font-size: 12.5px; color: #3A3B40")}>
                        {mp?.to}
                      </span>
                    </li>
                  </Fragment>
                ))}
              </ul>
              <p style={css("margin: 0; font-size: 12.5px; line-height: 1.45; color: #6B6C73")}>
                {v.ins?.gateNote}
              </p>
            </section>
          </>) : null}
          {v.ins?.isFn ? (<>
            <section style={css("flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px")}>
              <h3 style={css("margin: 0; font-size: 12px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.04em; color: #6B6C73")}>
                {v.ins?.reqLabel}
              </h3>
              {v.ins?.hasReq ? (<>
                <span style={css("font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 12.5px; color: #111114; overflow-wrap: anywhere")}>
                  {v.ins?.reqLine}
                </span>
                <div style={css(v.ins?.reqStyle)}>
                  {v.ins?.reqBody}
                </div>
                <p style={css("margin: 0; font-size: 12.5px; line-height: 1.45; color: #6B6C73")}>
                  {v.ins?.reqNote}
                </p>
              </>) : null}
              {v.ins?.reqPlain ? (<>
                <p style={css(v.ins?.reqTextStyle)}>
                  {v.ins?.reqText}
                </p>
              </>) : null}
              <button className="wb-btn" type="button" onClick={v.ins?.openApi} style={css("align-self: flex-start; height: 36px; padding: 0 12px; border: 1px solid #DCDDE2; font-size: 13px")}>
                {v.ins?.apiLabel}
              </button>
            </section>
          </>) : null}
        </aside>
      </>) : null}
      {v.api?.open ? (<>
        <div style={css("position: absolute; inset: 0; z-index: 41; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(17,17,20,0.32)")} onPointerDown={v.api?.close}>
          <div className="wb-bar" role="dialog" aria-label={v.api?.title} onPointerDown={v.stopEv} style={css("width: 100%; max-width: 760px; max-height: 100%; overflow: auto; box-sizing: border-box; padding: 22px; border-radius: 20px; display: flex; flex-direction: column; gap: 14px")}>
            <div style={css("display: flex; align-items: center; justify-content: space-between; gap: 8px")}>
              <h2 style={css("margin: 0; font-size: 20px; font-weight: 400; color: #111114")}>
                {v.api?.title}
              </h2>
              <button className="wb-btn" type="button" aria-label={v.api?.closeLabel} onClick={v.api?.close} style={css("width: 36px; height: 36px")}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <p style={css("margin: 0; font-size: 14px; line-height: 1.5; color: #3A3B40")}>
              {v.api?.intro}
            </p>
            <ul style={css("margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px")}>
              {(v.api?.rows || []).map((ar: any, i0: number) => (
                <Fragment key={i0}>
                  <li style={css("display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border: 1px solid #E3E4E8; border-radius: 12px")}>
                    <div style={css("display: flex; flex-wrap: wrap; align-items: center; gap: 8px")}>
                      <span style={css("flex: 1 1 260px; min-width: 0; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 13px; color: #111114; overflow-wrap: anywhere")}>
                        {ar?.line}
                      </span>
                      {ar?.stream ? (<>
                        <span style={css("flex: 0 0 auto; padding: 1px 8px; border-radius: 999px; font-size: 11.5px; background: #E7EEFB; color: #1A46A8")}>
                          {ar?.streamLabel}
                        </span>
                      </>) : null}
                      <span style={css("flex: 0 0 auto; padding: 1px 8px; border-radius: 999px; font-size: 11.5px; background: #FFE9C7; color: #7A4100")}>
                        {ar?.state}
                      </span>
                    </div>
                    <span style={css("font-size: 12.5px; color: #6B6C73")}>
                      {ar?.user}
                    </span>
                    <span style={css("font-size: 13px; line-height: 1.45; color: #3A3B40")}>
                      {ar?.note}
                    </span>
                  </li>
                </Fragment>
              ))}
            </ul>
            <button className="wb-primary" type="button" onClick={v.api?.copy} style={css(v.api?.copyStyle)}>
              {v.api?.copyLabel}
            </button>
          </div>
        </div>
      </>) : null}
      {v.mk?.open ? (<>
        <div style={css("position: absolute; inset: 0; z-index: 41; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(17,17,20,0.32)")} onPointerDown={v.mk?.close}>
          <div className="wb-bar" role="dialog" aria-label={v.mk?.title} onPointerDown={v.stopEv} style={css("width: 100%; max-width: 920px; height: 100%; max-height: 780px; box-sizing: border-box; padding: 20px 22px; border-radius: 20px; display: flex; flex-direction: column; gap: 12px")}>
            <div style={css("flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 8px")}>
              <h2 style={css("margin: 0; font-size: 20px; font-weight: 400; color: #111114")}>
                {v.mk?.title}
              </h2>
              <button className="wb-btn" type="button" aria-label={v.mk?.closeLabel} onClick={v.mk?.close} style={css("width: 36px; height: 36px")}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <p style={css("flex: 0 0 auto; margin: 0; font-size: 14px; line-height: 1.5; color: #3A3B40")}>
              {v.mk?.intro}
            </p>
            <div style={css("flex: 0 0 auto; display: flex; flex-wrap: wrap; gap: 4px; padding: 3px; border-radius: 13px; background: #F3F4F6; align-self: flex-start")}>
              {(v.mk?.tabs || []).map((mt: any, i0: number) => (
                <Fragment key={i0}>
                  <button className="wb-btn" type="button" aria-current={mt?.current} onClick={mt?.pick} style={css(mt?.style)}>
                    {mt?.label}
                  </button>
                </Fragment>
              ))}
            </div>
            {v.mk?.isBrowse ? (<>
              <div style={css("flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 8px")}>
                <label htmlFor="wb-market-search" className="wb-sr">
                  {v.mk?.searchLabel}
                </label>
                <input id="wb-market-search" className="wb-field" type="text" autoComplete="off" placeholder={v.mk?.searchHint} value={v.mk?.q} onChange={v.mk?.onQ} style={css("flex: 1 1 220px; width: auto; height: 40px; padding: 0 12px")} />
                <div style={css("display: flex; gap: 6px")}>
                  {(v.mk?.filters || []).map((mf: any, i0: number) => (
                    <Fragment key={i0}>
                      <button className="wb-btn" type="button" aria-pressed={mf?.pressed} onClick={mf?.pick} style={css(mf?.style)}>
                        {mf?.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
              <div style={css("flex: 1 1 auto; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 10px")}>
                <ul style={css("margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 10px")}>
                  {(v.mk?.cards || []).map((mkc: any, i0: number) => (
                    <Fragment key={i0}>
                      <li style={css("display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid #E3E4E8; border-radius: 14px; background: #FFFFFF")}>
                        <div style={css("display: flex; align-items: center; gap: 10px")}>
                          <span aria-hidden="true" style={css(v.stkLib)}>
                            {(mkc?.stk || []).map((L: any, i2: number) => (
                              <Fragment key={i2}>
                                <svg aria-hidden="true" width="100%" height="100%" viewBox={L?.vb} style={css("position: absolute; left: 0; top: 0; overflow: visible")}>
                                  <path d={L?.d} fill={L?.f} stroke={L?.s} strokeWidth={L?.w} strokeLinecap="round" strokeLinejoin="round" opacity={L?.op} />
                                </svg>
                              </Fragment>
                            ))}
                          </span>
                          <div style={css("flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 1px")}>
                            <span style={css("font-size: 15px; color: #111114; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                              {mkc?.t?.name}
                            </span>
                            <span style={css("font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 11.5px; color: #6B6C73; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                              {mkc?.t?.by}
                            </span>
                          </div>
                        </div>
                        <p style={css("margin: 0; flex: 1 1 auto; font-size: 13.5px; line-height: 1.45; color: #3A3B40")}>
                          {mkc?.t?.summary}
                        </p>
                        <span style={css("font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 11.5px; color: #3A3B40; overflow-wrap: anywhere")}>
                          {mkc?.t?.io}
                        </span>
                        <div style={css("display: flex; flex-wrap: wrap; gap: 5px")}>
                          <span style={css(mkc?.runsStyle)}>
                            {mkc?.runs}
                          </span>
                          <span style={css(mkc?.checkedStyle)}>
                            {mkc?.checked}
                          </span>
                          {mkc?.yours ? (<>
                            <span style={css(mkc?.yoursStyle)}>
                              {mkc?.yoursLabel}
                            </span>
                          </>) : null}
                        </div>
                        <div style={css("display: flex; flex-wrap: wrap; gap: 6px")}>
                          <button className="wb-primary" type="button" onClick={mkc?.main} style={css(mkc?.mainStyle)}>
                            {mkc?.mainLabel}
                          </button>
                          {mkc?.has ? (<>
                            <button className="wb-primary" type="button" aria-pressed={mkc?.pinPressed} onClick={mkc?.pin} style={css(mkc?.pinStyle)}>
                              {mkc?.pinLabel}
                            </button>
                          </>) : null}
                          {mkc?.has ? (<>
                            <button className="wb-primary" type="button" onClick={mkc?.remove} style={css("height: 36px; padding: 0 12px; background: transparent; color: #6B6C73")}>
                              {mkc?.removeLabel}
                            </button>
                          </>) : null}
                        </div>
                      </li>
                    </Fragment>
                  ))}
                </ul>
                {v.mk?.empty ? (<>
                  <p style={css("margin: 24px 0; text-align: center; font-size: 14px; color: #6B6C73")}>
                    {v.mk?.emptyText}
                  </p>
                </>) : null}
                <p style={css("margin: 0; font-size: 12.5px; color: #6B6C73")}>
                  {v.mk?.note}
                </p>
              </div>
            </>) : null}
            {v.mk?.isPublish ? (<>
              <div style={css("flex: 1 1 auto; min-height: 0; overflow: auto; display: flex; flex-wrap: wrap; align-items: flex-start; gap: 16px")}>
                <div style={css("flex: 1 1 380px; min-width: 0; display: flex; flex-direction: column; gap: 10px")}>
                  <p style={css("margin: 0; font-size: 14px; line-height: 1.5; color: #3A3B40")}>
                    {v.mk?.pubIntro}
                  </p>
                  <label htmlFor="wb-market-draft" style={css("margin: 0; font-size: 12px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.04em; color: #6B6C73")}>
                    {v.mk?.draftLabel}
                  </label>
                  <textarea id="wb-market-draft" className="wb-field" wrap="off" value={v.mk?.draft} onChange={v.mk?.onDraft} style={css("font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; height: 300px; box-sizing: border-box; padding: 12px; border: 1px solid #DCDDE2; border-radius: 12px; font-size: 12.5px; line-height: 1.5; color: #111114; background: #FAFAFB; resize: vertical; white-space: pre; overflow: auto")} />
                  <h3 style={css("margin: 0; font-size: 12px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.04em; color: #6B6C73")}>
                    {v.mk?.checkTitle}
                  </h3>
                  <div role="status">
                    <ul style={css("margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px")}>
                      {(v.mk?.checks || []).map((ck: any, i0: number) => (
                        <Fragment key={i0}>
                          <li style={css(ck?.style)}>
                            <span style={css("flex: 0 0 auto; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 12px")}>
                              {ck?.path}
                            </span>
                            <span style={css("min-width: 0; overflow-wrap: anywhere")}>
                              {ck?.text}
                            </span>
                          </li>
                        </Fragment>
                      ))}
                    </ul>
                  </div>
                  <div style={css("display: flex; flex-wrap: wrap; gap: 8px")}>
                    <button className="wb-primary" type="button" aria-disabled={v.mk?.blocked} onClick={v.mk?.tryIt} style={css(v.mk?.tryStyle)}>
                      {v.mk?.tryLabel}
                    </button>
                    <button className="wb-primary" type="button" aria-disabled={v.mk?.blocked} onClick={v.mk?.publish} style={css(v.mk?.pubStyle)}>
                      {v.mk?.pubLabel}
                    </button>
                    <button className="wb-primary" type="button" onClick={v.mk?.reset} style={css("height: 40px; padding: 0 12px; background: transparent; color: #6B6C73")}>
                      {v.mk?.resetLabel}
                    </button>
                  </div>
                </div>
                <div style={css("flex: 1 1 300px; min-width: 0; display: flex; flex-direction: column; gap: 14px")}>
                  <section style={css("display: flex; flex-direction: column; gap: 8px")}>
                    <h3 style={css("margin: 0; font-size: 12px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.04em; color: #6B6C73")}>
                      {v.mk?.rulesTitle}
                    </h3>
                    <ul style={css("margin: 0; padding: 0 0 0 18px; display: flex; flex-direction: column; gap: 5px; font-size: 13.5px; line-height: 1.45; color: #3A3B40")}>
                      {(v.mk?.rules || []).map((rl: any, i0: number) => (
                        <Fragment key={i0}>
                          <li>
                            {rl?.text}
                          </li>
                        </Fragment>
                      ))}
                    </ul>
                  </section>
                  <section style={css("display: flex; flex-direction: column; gap: 8px; padding: 14px; border: 1px solid #E3E4E8; border-radius: 14px")}>
                    <h3 style={css("margin: 0; font-size: 12px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.04em; color: #6B6C73")}>
                      {v.mk?.agentTitle}
                    </h3>
                    <p style={css("margin: 0; font-size: 13.5px; line-height: 1.45; color: #3A3B40")}>
                      {v.mk?.agentNote}
                    </p>
                    <ul style={css("margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px")}>
                      {(v.mk?.tools || []).map((tl: any, i0: number) => (
                        <Fragment key={i0}>
                          <li style={css("display: flex; flex-direction: column; gap: 1px")}>
                            <span style={css("font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 12.5px; color: #111114")}>
                              {tl?.name?.text}
                            </span>
                            <span style={css("font-size: 12.5px; line-height: 1.4; color: #6B6C73")}>
                              {tl?.text}
                            </span>
                          </li>
                        </Fragment>
                      ))}
                    </ul>
                    <div style={css("display: flex; flex-wrap: wrap; gap: 8px")}>
                      <button className="wb-primary" type="button" onClick={v.mk?.copySkill} style={css(v.mk?.agentBtn)}>
                        {v.mk?.skillLabel}
                      </button>
                      <button className="wb-primary" type="button" onClick={v.mk?.copyMcp} style={css(v.mk?.agentBtn)}>
                        {v.mk?.mcpLabel}
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            </>) : null}
          </div>
        </div>
      </>) : null}
      {v.vw?.open ? (<>
        <div style={css("position: absolute; inset: 0; z-index: 41; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(17,17,20,0.32)")} onPointerDown={v.vw?.close}>
          <div className="wb-bar" role="dialog" aria-label={v.vw?.title} onPointerDown={v.stopEv} style={css("width: 100%; max-width: 940px; height: 100%; max-height: 780px; box-sizing: border-box; padding: 18px 20px; border-radius: 20px; display: flex; flex-direction: column; gap: 12px")}>
            <div style={css("flex: 0 0 auto; display: flex; align-items: center; gap: 10px")}>
              <div style={css("flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px")}>
                <span style={css("font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 11.5px; color: #6B6C73")}>
                  {v.vw?.title}
                </span>
                <h2 style={css("margin: 0; font-size: 19px; font-weight: 400; color: #111114; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                  {v.vw?.heading?.text}
                </h2>
              </div>
              {v.vw?.sim ? (<>
                <span style={css("flex: 0 0 auto; padding: 2px 9px; border-radius: 999px; font-size: 11.5px; background: #FFE9C7; color: #7A4100")}>
                  {v.vw?.simLabel}
                </span>
              </>) : null}
              <button className="wb-btn" type="button" aria-label={v.vw?.closeLabel} onClick={v.vw?.close} style={css("flex: 0 0 auto; width: 36px; height: 36px")}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <p style={css("flex: 0 0 auto; margin: 0; font-size: 13px; line-height: 1.45; color: #3A3B40")}>
              {v.vw?.note}
            </p>
            <div style={css(v.vw?.stage)}>
              {v.vw?.isBlocks ? (<>
                <div style={css(v.vw?.paper)}>
                  {(v.vw?.blocks || []).map((vb: any, i0: number) => (
                    <Fragment key={i0}>
                      {vb?.head ? (<>
                        <div role="heading" aria-level={vb?.level} style={css(vb?.style)}>
                          {vb?.text}
                        </div>
                      </>) : null}
                      {vb?.plain ? (<>
                        <div style={css(vb?.style)}>
                          {vb?.text}
                          {(vb?.cells || []).map((vc: any, i2: number) => (
                            <Fragment key={i2}>
                              <span style={css(vc?.style)}>
                                {vc?.text}
                              </span>
                            </Fragment>
                          ))}
                        </div>
                      </>) : null}
                      {vb?.table ? (<>
                        <div role="table" style={css(vb?.style)}>
                          {(vb?.rows || []).map((vr: any, i2: number) => (
                            <Fragment key={i2}>
                              <div role="row" style={css(vr?.style)}>
                                {(vr?.cells || []).map((vc: any, i4: number) => (
                                  <Fragment key={i4}>
                                    <span role={vc?.role} style={css(vc?.style)}>
                                      {vc?.text}
                                    </span>
                                  </Fragment>
                                ))}
                              </div>
                            </Fragment>
                          ))}
                        </div>
                      </>) : null}
                    </Fragment>
                  ))}
                </div>
              </>) : null}
              {v.vw?.isSheet ? (<>
                <div role="table" aria-label={v.vw?.heading?.text} style={css(v.vw?.grid)}>
                  <div role="row" style={css(v.vw?.headRow)}>
                    <span role="columnheader" aria-label="#" style={css(v.vw?.corner)} />
                    {(v.vw?.cols || []).map((vc: any, i0: number) => (
                      <Fragment key={i0}>
                        <div role="columnheader" aria-sort={vc?.sort} style={css(vc?.style)}>
                          <button className="wb-btn" type="button" title={vc?.hint} onClick={vc?.pick} style={css(vc?.btn)}>
                            <span style={css("min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                              {vc?.label}
                            </span>
                            <span aria-hidden="true">
                              {vc?.mark}
                            </span>
                          </button>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                  {(v.vw?.rows || []).map((vr: any, i0: number) => (
                    <Fragment key={i0}>
                      <div role="row" style={css(vr?.style)}>
                        <span role="rowheader" style={css(vr?.numStyle)}>
                          {vr?.num}
                        </span>
                        {(vr?.cells || []).map((vc: any, i2: number) => (
                          <Fragment key={i2}>
                            <span role="cell" style={css(vc?.style)}>
                              {vc?.text}
                            </span>
                          </Fragment>
                        ))}
                      </div>
                    </Fragment>
                  ))}
                </div>
              </>) : null}
              {v.vw?.showSrc ? (<>
                <div style={css("font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; box-sizing: border-box; max-width: 860px; margin: 0 auto; padding: 16px 18px; background: #FFFFFF; border: 1px solid #E3E4E8; border-radius: 8px; font-size: 12.5px; line-height: 1.55; color: #111114; white-space: pre-wrap; overflow-wrap: anywhere")}>
                  {v.vw?.src?.text}
                </div>
              </>) : null}
            </div>
            {v.vw?.isSlides ? (<>
              <div style={css("flex: 0 0 auto; display: flex; align-items: center; gap: 8px")}>
                <button className="wb-btn" type="button" aria-label={v.vw?.prevLabel} title={v.vw?.prevLabel} disabled={v.vw?.noPrev} onClick={v.vw?.prev} style={css("flex: 0 0 auto; width: 40px; height: 40px")}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </button>
                <div style={css("flex: 1 1 auto; min-width: 0; display: flex; gap: 6px; overflow: auto; padding: 2px")}>
                  {(v.vw?.thumbs || []).map((tn: any, i0: number) => (
                    <Fragment key={i0}>
                      <button className="wb-btn" type="button" aria-label={tn?.name} aria-current={tn?.current} onClick={tn?.pick} style={css(tn?.style)}>
                        {tn?.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
                <span style={css("flex: 0 0 auto; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 12px; color: #3A3B40")}>
                  {v.vw?.pos}
                </span>
                <button className="wb-btn" type="button" aria-label={v.vw?.nextLabel} title={v.vw?.nextLabel} disabled={v.vw?.noNext} onClick={v.vw?.next} style={css("flex: 0 0 auto; width: 40px; height: 40px")}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </>) : null}
            {v.vw?.hasSums ? (<>
              <div style={css("flex: 0 0 auto; display: flex; flex-wrap: wrap; gap: 6px")}>
                {(v.vw?.sums || []).map((sm: any, i0: number) => (
                  <Fragment key={i0}>
                    <span style={css("padding: 3px 10px; border-radius: 999px; background: #EAF4EE; font-size: 12.5px; color: #14532D")}>
                      {sm?.text}
                    </span>
                  </Fragment>
                ))}
              </div>
            </>) : null}
            <div style={css("flex: 0 0 auto; display: flex; flex-wrap: wrap; gap: 8px")}>
              {(v.vw?.acts || []).map((va: any, i0: number) => (
                <Fragment key={i0}>
                  <button className="wb-primary" type="button" onClick={va?.run} style={css(va?.style)}>
                    {va?.label}
                  </button>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </>) : null}
      {v.help?.open ? (<>
        <div style={css("position: absolute; inset: 0; z-index: 41; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(17,17,20,0.32)")} onPointerDown={v.help?.close}>
          <div className="wb-bar" role="dialog" aria-label={v.help?.title} onPointerDown={v.stopEv} style={css("width: 100%; max-width: 860px; max-height: 100%; overflow: auto; box-sizing: border-box; padding: 22px; border-radius: 20px; display: flex; flex-direction: column; gap: 16px")}>
            <div style={css("display: flex; align-items: center; justify-content: space-between; gap: 8px")}>
              <h2 style={css("margin: 0; font-size: 20px; font-weight: 400; color: #111114")}>
                {v.help?.title}
              </h2>
              <button className="wb-btn" type="button" aria-label={v.help?.closeLabel} onClick={v.help?.close} style={css("width: 36px; height: 36px")}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div style={css("display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px 28px")}>
              {(v.help?.groups || []).map((hg: any, i0: number) => (
                <Fragment key={i0}>
                  <section style={css("display: flex; flex-direction: column; gap: 4px; min-width: 0")}>
                    <h3 style={css("margin: 0 0 4px; font-size: 12px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.04em; color: #6B6C73")}>
                      {hg?.title}
                    </h3>
                    {(hg?.rows || []).map((hr: any, i2: number) => (
                      <Fragment key={i2}>
                        <div style={css("display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 30px; font-size: 14px; color: #111114")}>
                          <span style={css("min-width: 0")}>
                            {hr?.label}
                          </span>
                          <span style={css("flex: 0 0 auto; padding: 2px 8px; border-radius: 7px; background: #F3F4F6; border: 1px solid #E3E4E8; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; color: #3A3B40; white-space: nowrap")}>
                            {hr?.keys}
                          </span>
                        </div>
                      </Fragment>
                    ))}
                  </section>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </>) : null}
      {v.sh?.open ? (<>
        <div style={css("position: absolute; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(17,17,20,0.32)")} onPointerDown={v.sh?.close}>
          <div className="wb-bar" role="dialog" aria-label={v.sh?.title} onPointerDown={v.stopEv} style={css("width: 100%; max-width: 520px; box-sizing: border-box; padding: 20px; border-radius: 20px; display: flex; flex-direction: column; gap: 14px")}>
            <div style={css("display: flex; align-items: center; justify-content: space-between; gap: 8px")}>
              <h2 style={css("margin: 0; font-size: 20px; font-weight: 400; color: #111114")}>
                {v.sh?.title}
              </h2>
              <button className="wb-btn" type="button" aria-label={v.sh?.closeLabel} onClick={v.sh?.close} style={css("width: 36px; height: 36px")}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div role="tablist" style={css("display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 14px; background: #F3F4F6")}>
              {(v.sh?.tabs || []).map((tb: any, i0: number) => (
                <Fragment key={i0}>
                  <button className="wb-btn" type="button" role="tab" aria-selected={tb?.selected} onClick={tb?.pick} style={css(tb?.style)}>
                    {tb?.label}
                  </button>
                </Fragment>
              ))}
            </div>
            <p style={css("margin: 0; font-size: 14px; line-height: 1.5; color: #6B6C73")}>
              {v.sh?.note}
            </p>
            {v.sh?.hasOptions ? (<>
              <div style={css("display: flex; flex-wrap: wrap; gap: 8px")}>
                {(v.sh?.options || []).map((op: any, i0: number) => (
                  <Fragment key={i0}>
                    <button className="wb-btn" type="button" role="switch" aria-checked={op?.checked} onClick={op?.pick} style={css(op?.style)}>
                      {op?.label}
                    </button>
                  </Fragment>
                ))}
              </div>
            </>) : null}
            {v.sh?.hasCode ? (<>
              <pre style={css("margin: 0; padding: 14px; border-radius: 12px; background: #1E1F24; color: #F3F4F6; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12.5px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; user-select: text")}>
                {v.sh?.code}
              </pre>
            </>) : null}
            <div style={css("display: flex; justify-content: flex-end; gap: 8px")}>
              {v.sh?.needsSignIn ? (<>
                <a className="wb-menu-item" href={v.links?.SignIn} onClick={v.follow} style={css(v.sh?.primary)}>
                  {v.sh?.signInLabel}
                </a>
              </>) : null}
              {v.sh?.canCopy ? (<>
                <button className="wb-primary" type="button" onClick={v.sh?.copy} style={css(v.sh?.primary)}>
                  {v.sh?.copyLabel}
                </button>
              </>) : null}
            </div>
          </div>
        </div>
      </>) : null}
      {v.hasToast ? (<>
        <div role="status" style={css(v.toastStyle)}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7EE2B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          <span>
            {v.toast}
          </span>
        </div>
      </>) : null}
    </main>
    </>
  );
}
