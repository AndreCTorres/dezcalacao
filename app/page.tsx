'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

export default function Home() {
  const heroNotaRef = useRef<HTMLSpanElement>(null)

  // Count-up na nota do herói
  useEffect(() => {
    const el = heroNotaRef.current
    if (!el) return
    const target = 9.2
    let cur = 0
    const t = setInterval(() => {
      cur += 0.25
      if (cur >= target) { cur = target; clearInterval(t) }
      el.textContent = cur.toFixed(1)
    }, 20)
    return () => clearInterval(t)
  }, [])

  // Reveal on scroll
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in')
          observer.unobserve(e.target)
        }
      })
    }, { threshold: 0.15 })
    document.querySelectorAll('.lp-reveal').forEach((el, i) => {
      const htmlEl = el as HTMLElement
      htmlEl.style.transitionDelay = `${(i % 4) * 0.07}s`
      observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="lp-body">

      {/* NAV */}
      <nav className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <div className="lp-brand"><span className="dez">DEZ</span>calação</div>
          <div className="lp-nav-links">
            <a href="#como">Como funciona</a>
            <a href="#regras">Regras</a>
            <a href="#pontua">Pontuação</a>
            <Link href="/login" className="lp-btn lp-btn-ghost">Entrar</Link>
            <Link href="/login" className="lp-btn lp-btn-primary">Criar meu grupo</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="lp-wrap lp-hero">
        <div>
          <span className="lp-kicker">
            <span className="dot"></span>Copa do Mundo 2026 · Fantasy Draft
          </span>
          <h1 className="lp-h1">
            O fantasy da Copa,{' '}
            <span className="accent">decidido</span>{' '}
            na <span className="gold">nota</span>.
          </h1>
          <p className="lp-lead">
            Monte um time de <b>16 craques</b> — um de cada seleção. A cada rodada,
            a <b>nota real</b> de cada jogador em campo vira seus pontos.
            Ganhe a rodada. Ganhe a Copa.
          </p>
          <div className="lp-cta-row">
            <Link href="/login" className="lp-btn lp-btn-primary">Criar meu grupo</Link>
            <Link href="/login" className="lp-btn lp-btn-ghost">Já tenho convite →</Link>
          </div>
        </div>

        {/* Card de rating */}
        <div className="lp-card-stage">
          <div className="lp-rating-card">
            <div className="lp-rc-pos">
              <span>ATK · CAMISA 7</span>
              <span>RODADA 3</span>
            </div>
            <div className="lp-big-nota">
              <span ref={heroNotaRef}>0.0</span>
            </div>
            <div className="lp-pname">Vini Jr.</div>
            <div className="lp-pteam">
              dominou a partida — 2 dribles por minuto, impossível de marcar
            </div>
            <div className="lp-chips">
              <span className="lp-chip">2 gols</span>
              <span className="lp-chip">1 assistência</span>
              <span className="lp-chip">8 dribles</span>
              <span className="lp-chip">craque da partida</span>
            </div>
          </div>
          <div className="lp-float lp-f1">GK · <span className="n">7.8</span></div>
          <div className="lp-float lp-f2">MEI · <span className="n">8.3</span></div>
        </div>
      </header>

      <div className="lp-divider"></div>

      {/* COMO FUNCIONA */}
      <section id="como" className="lp-wrap lp-steps-section">
        <div className="lp-sec-head">
          <span className="lp-sec-tag">// como funciona</span>
          <h2 className="lp-sec-title">Quatro passos até o título</h2>
        </div>
        <div className="lp-steps-grid">
          <div className="lp-step lp-reveal">
            <div className="num">01</div>
            <h3>Crie o grupo</h3>
            <p>Você cria o bolão e convida a galera. Cada um entra com seu próprio acesso.</p>
          </div>
          <div className="lp-step lp-reveal">
            <div className="num">02</div>
            <h3>Faça o draft</h3>
            <p>O admin atribui 16 jogadores a cada membro: 11 titulares + 5 reservas, um por seleção.</p>
          </div>
          <div className="lp-step lp-reveal">
            <div className="num">03</div>
            <h3>Acompanhe o torneio</h3>
            <p>A nota real dos jogadores vira pontos a cada rodada. Faça substituições quando precisar.</p>
          </div>
          <div className="lp-step lp-reveal">
            <div className="num">04</div>
            <h3>Vença</h3>
            <p>Quem somar mais pontos na rodada vence a rodada. Quem somar mais no total vence a Copa.</p>
          </div>
        </div>
      </section>

      <div className="lp-divider"></div>

      {/* REGRAS */}
      <section id="regras" className="lp-wrap lp-rules-section">
        <div className="lp-sec-head">
          <span className="lp-sec-tag">// as regras do jogo</span>
          <h2 className="lp-sec-title">Estratégia em cada escolha</h2>
        </div>
        <div className="lp-rules-grid">
          <div className="lp-rule lp-reveal">
            <div className="ic">[ 01 ]</div>
            <h3>Um por seleção</h3>
            <p>Seu time tem 16 jogadores de 16 seleções diferentes. Não dá pra empilhar craques do mesmo país.</p>
          </div>
          <div className="lp-rule lp-reveal">
            <div className="ic">[ 02 ]</div>
            <h3>11 titulares + 5 reservas</h3>
            <p>Os 11 titulares pontuam a cada rodada. Os 5 reservas ficam no banco, prontos pra entrar.</p>
          </div>
          <div className="lp-rule lp-reveal">
            <div className="ic">[ 03 ]</div>
            <h3>Substituições por posição</h3>
            <p>Pode trocar reserva por titular, mas só da mesma posição: MEI no lugar de MEI, ATK por ATK.</p>
          </div>
          <div className="lp-rule lp-reveal">
            <div className="ic">[ 04 ]</div>
            <h3>Pontua pela nota do jogo</h3>
            <p>A nota de desempenho de cada titular na rodada vira seus pontos. Some os 11 e sai o total.</p>
          </div>
          <div className="lp-rule bonus lp-reveal">
            <span className="lp-badge-bonus">BÔNUS</span>
            <div className="ic">[ 05 ]</div>
            <h3>Seleção da Rodada</h3>
            <p>O sistema monta o XI da rodada pelas maiores notas por posição. Tem jogador teu nela? Pontos extras.</p>
          </div>
          <div className="lp-rule bonus lp-reveal">
            <span className="lp-badge-bonus">BÔNUS</span>
            <div className="ic">[ 06 ]</div>
            <h3>Craque da partida</h3>
            <p>O melhor de cada jogo pela nota rende um bônus. Achar o craque escondido pode virar o jogo.</p>
          </div>
        </div>
      </section>

      <div className="lp-divider"></div>

      {/* COMO PONTUA */}
      <section id="pontua" className="lp-wrap lp-scoring-section">
        <div className="lp-scoring-text lp-reveal">
          <span className="lp-sec-tag">// a matemática</span>
          <h2 className="lp-sec-title" style={{ marginBottom: '22px' }}>
            Sua rodada,<br />somada
          </h2>
          <p>
            No fim da rodada, pegamos a <b>nota de cada titular</b> e somamos.
            Sem sistema complicado: é a mesma nota que sai na transmissão,
            objetiva e igualzinho pra todo mundo do grupo.
          </p>
          <p>
            Os <b>bônus</b> (Seleção da Rodada e craque da partida) são aditivos —
            opcionais e configuráveis por grupo. Podem virar o jogo na última rodada.
          </p>
        </div>
        <div className="lp-scoreboard lp-reveal">
          <div className="lp-sb-head"><span>Seu time · Rodada 3</span><span>Nota</span></div>
          <div className="lp-sb-row">
            <div className="lp-sb-left">
              <span className="lp-sb-pos">GK</span>
              <div>
                <div className="lp-sb-name">Alisson</div>
                <div className="lp-sb-sub">2 defesas difíceis</div>
              </div>
            </div>
            <span className="lp-sb-nota">7.8</span>
          </div>
          <div className="lp-sb-row">
            <div className="lp-sb-left">
              <span className="lp-sb-pos">ZAG</span>
              <div>
                <div className="lp-sb-name">Rúben Dias</div>
                <div className="lp-sb-sub">impecável na marcação</div>
              </div>
            </div>
            <span className="lp-sb-nota">7.5</span>
          </div>
          <div className="lp-sb-row">
            <div className="lp-sb-left">
              <span className="lp-sb-pos">MEI</span>
              <div>
                <div className="lp-sb-name">Pedri</div>
                <div className="lp-sb-sub">controlou o meio-campo</div>
              </div>
            </div>
            <span className="lp-sb-nota lp-hi">8.3</span>
          </div>
          <div className="lp-sb-row">
            <div className="lp-sb-left">
              <span className="lp-sb-pos">ATK</span>
              <div>
                <div className="lp-sb-name">Vini Jr.</div>
                <div className="lp-sb-sub">2 gols + craque da partida</div>
              </div>
            </div>
            <span className="lp-sb-nota lp-hi">9.2</span>
          </div>
          <div className="lp-sb-row">
            <div className="lp-sb-left">
              <span className="lp-sb-pos">+ 7</span>
              <div>
                <div className="lp-sb-name">restante do time</div>
                <div className="lp-sb-sub">titulares em campo</div>
              </div>
            </div>
            <span className="lp-sb-nota">…</span>
          </div>
          <div className="lp-sb-total">
            <span className="lbl">Total da rodada</span>
            <span className="val">87.1</span>
          </div>
        </div>
      </section>

      <div className="lp-divider"></div>

      {/* DESTAQUES DA RODADA — substitui stats strip */}
      <section className="lp-wrap lp-reveal" style={{ padding: '80px 0' }}>
        <div style={{ marginBottom: '28px' }}>
          <span className="lp-sec-tag">// destaques da rodada</span>
          <h2 className="lp-sec-title" style={{ marginTop: '10px' }}>Quem pontuou alto</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          {[
            { pos: 'GK', name: 'Alisson', sel: 'Brasil', nota: '8.1', desc: '3 defesas + 1 pênalti defendido', color: 'var(--lime)' },
            { pos: 'ZAG', name: 'Rúben Dias', sel: 'Portugal', nota: '7.9', desc: 'Limpeza total na zaga', color: 'var(--lime)' },
            { pos: 'MEI', name: 'Pedri', sel: 'Espanha', nota: '8.6', desc: '94 passes · 1 assistência', color: 'var(--gold)' },
            { pos: 'ATK', name: 'Vini Jr.', sel: 'Brasil', nota: '9.2', desc: '2 gols · 8 dribles · craque', color: 'var(--gold)' },
          ].map((p, i) => (
            <div
              key={i}
              className="lp-reveal"
              style={{
                background: 'linear-gradient(160deg, #111b16, #0c1410)',
                border: '1px solid var(--line-soft)',
                borderRadius: '16px',
                padding: '20px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color .25s, transform .25s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(197,242,74,.3)'
                e.currentTarget.style.transform = 'translateY(-4px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--line-soft)'
                e.currentTarget.style.transform = 'none'
              }}
            >
              {/* Glow de fundo */}
              <div style={{
                position: 'absolute', top: '-20px', right: '-20px',
                width: '80px', height: '80px', borderRadius: '50%',
                background: p.color === 'var(--gold)' ? 'rgba(246,201,69,.07)' : 'rgba(197,242,74,.07)',
                filter: 'blur(20px)',
                pointerEvents: 'none',
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <span style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '10px',
                  letterSpacing: '2px', color: p.color, textTransform: 'uppercase',
                  background: p.color === 'var(--gold)' ? 'rgba(246,201,69,.1)' : 'rgba(197,242,74,.1)',
                  padding: '3px 8px', borderRadius: '6px',
                }}>
                  {p.pos}
                </span>
                <span style={{
                  fontFamily: 'Anton, sans-serif', fontSize: '36px',
                  color: p.color, lineHeight: '1',
                }}>
                  {p.nota}
                </span>
              </div>

              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: '20px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                {p.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px' }}>
                {p.sel}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(243,244,239,.5)', lineHeight: '1.4' }}>
                {p.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="lp-divider"></div>

      {/* CTA FINAL */}
      <section id="entrar" className="lp-wrap lp-cta-section">
        <h2>Bora montar seu <span className="accent">time campeão</span>?</h2>
        <p className="sub">
          A Copa já começou. Cria teu grupo ou entra no convite da galera.
        </p>
        <div className="lp-cta-btns">
          <Link href="/login" className="lp-btn lp-btn-primary" style={{ fontSize: '17px', padding: '14px 32px' }}>
            ⚽ Criar meu grupo
          </Link>
          <Link href="/login" className="lp-btn lp-btn-ghost" style={{ fontSize: '17px', padding: '14px 32px' }}>
            Já tenho convite →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-foot-in">
            <div className="lp-brand"><span className="dez">DEZ</span>calação</div>
            <p>Feito pelo Dezo · Copa 2026</p>
          </div>
          <p className="lp-disclaim">
            Projeto de bolão entre amigos, sem fins de aposta. Não é afiliado nem endossado
            pela FIFA ou por qualquer seleção. Nomes de jogadores são usados de forma ilustrativa.
          </p>
        </div>
      </footer>

    </div>
  )
}
