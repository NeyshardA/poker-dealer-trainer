(() => {
  'use strict';

  const SUPABASE_URL = 'https://shzbrvmmtrwexayxeatz.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_xC_FEEU2uWeLzSnVfZKECQ_XV_v8SPg';

  if (!window.supabase?.createClient) {
    console.error('Poker101Class account system could not load Supabase.');
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  let currentUser = null;
  let suppressProgressSync = false;
  let syncTimer = null;

  const trainers = {
    'table-games': {
      label: 'Table Games Payouts',
      href: 'trainers/table-games.html',
      storageKey: 'table-games-payout-v4',
      bodyClass: 'table-games-page',
      summarize(raw) {
        const t = raw?.totals || {};
        const questions = Number(t.n) || 0;
        const correct = Number(t.c) || 0;
        return {
          questions,
          correct,
          accuracy: questions ? Math.round((correct / questions) * 100) : 0,
          avg_response_ms: questions ? Math.round((Number(t.ms) || 0) / questions) : 0,
          streak: Number(t.streak) || 0,
          best_streak: Number(t.best) || 0,
          sessions: Array.isArray(raw?.sessions) ? raw.sessions.length : 0
        };
      }
    },
    'mental-math': {
      label: 'Dealer Mental Math',
      href: 'trainers/mental-math.html',
      storageKey: 'pokerDealerMentalMathTrainer_v1',
      bodyClass: 'mental-math-page',
      summarize(raw) {
        const s = raw?.stats || {};
        const correct = Number(s.correct) || 0;
        const wrong = Number(s.wrong) || 0;
        const questions = correct + wrong;
        const timed = Number(s.timedAnswers) || 0;
        return {
          questions,
          correct,
          accuracy: questions ? Math.round((correct / questions) * 100) : 0,
          avg_response_ms: timed ? Math.round((Number(s.totalMs) || 0) / timed) : 0,
          streak: Number(s.currentStreak) || 0,
          best_streak: Number(s.bestStreak) || 0,
          level: Number(raw?.progressiveLevel) || 1
        };
      }
    },
    'mixed-games': {
      label: 'Mixed Games',
      href: 'trainers/mixed-games.html',
      storageKey: 'mixed-games-dealer-v1',
      bodyClass: 'mixed-games-page',
      summarize(raw) {
        const questions = Number(raw?.n) || 0;
        const correct = Number(raw?.c) || 0;
        return {
          questions,
          correct,
          accuracy: questions ? Math.round((correct / questions) * 100) : 0,
          avg_response_ms: 0,
          streak: Number(raw?.streak) || 0,
          best_streak: Number(raw?.best) || 0
        };
      }
    }
  };

  function trainerForPage() {
    const body = document.body;
    return Object.entries(trainers).find(([, config]) => body?.classList.contains(config.bodyClass)) || null;
  }

  function safeParse(value) {
    try { return JSON.parse(value); } catch { return null; }
  }

  function meaningful(summary) {
    return Number(summary?.questions || 0) > 0;
  }

  async function saveTrainerProgress(trainerKey, raw) {
    if (!currentUser || !trainers[trainerKey] || !raw) return;
    const config = trainers[trainerKey];
    const summary = config.summarize(raw);
    if (!meaningful(summary)) return;

    const payload = {
      user_id: currentUser.id,
      trainer_key: trainerKey,
      metrics: {
        summary,
        raw,
        storage_key: config.storageKey,
        schema_version: 1
      },
      last_activity_at: new Date().toISOString()
    };

    const { error } = await client
      .from('trainer_progress')
      .upsert(payload, { onConflict: 'user_id,trainer_key' });

    if (error) console.error('Poker101Class progress sync failed:', error.message);
  }

  function scheduleProgressSync(storageKey, value) {
    const current = trainerForPage();
    if (!current || suppressProgressSync) return;
    const [trainerKey, config] = current;
    if (storageKey !== config.storageKey) return;
    const raw = safeParse(value);
    if (!raw) return;

    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => saveTrainerProgress(trainerKey, raw), 500);
  }

  const nativeSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    nativeSetItem.call(this, key, value);
    if (this === window.localStorage) scheduleProgressSync(String(key), String(value));
  };

  async function restoreOrSyncCurrentTrainer() {
    if (!currentUser) return;
    const current = trainerForPage();
    if (!current) return;

    const [trainerKey, config] = current;
    const localRaw = safeParse(localStorage.getItem(config.storageKey));
    const localSummary = config.summarize(localRaw || {});

    const { data, error } = await client
      .from('trainer_progress')
      .select('metrics,last_activity_at,updated_at')
      .eq('user_id', currentUser.id)
      .eq('trainer_key', trainerKey)
      .maybeSingle();

    if (error) {
      console.error('Poker101Class cloud progress load failed:', error.message);
      return;
    }

    if (meaningful(localSummary)) {
      await saveTrainerProgress(trainerKey, localRaw);
      return;
    }

    const cloudRaw = data?.metrics?.raw;
    const cloudSummary = data?.metrics?.summary;
    if (cloudRaw && meaningful(cloudSummary)) {
      suppressProgressSync = true;
      nativeSetItem.call(localStorage, config.storageKey, JSON.stringify(cloudRaw));
      suppressProgressSync = false;

      const reloadKey = 'p101-restored-' + trainerKey;
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        location.reload();
      }
    }
  }

  function setAuthControls(user) {
    document.querySelectorAll('[data-auth-guest]').forEach(el => el.hidden = !!user);
    document.querySelectorAll('[data-auth-user]').forEach(el => el.hidden = !user);
    document.querySelectorAll('[data-account-email]').forEach(el => {
      el.textContent = user?.email || '';
    });
  }

  function fmtMs(ms) {
    const n = Number(ms) || 0;
    return n ? (n / 1000).toFixed(1) + 's' : '—';
  }

  function fmtDate(iso) {
    if (!iso) return 'Not started';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Not started';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  async function renderMemberDashboard() {
    const section = document.getElementById('member-progress');
    if (!section) return;

    if (!currentUser) {
      section.hidden = true;
      return;
    }

    section.hidden = false;

    const [{ data: profile }, { data: progress, error }] = await Promise.all([
      client.from('profiles').select('display_name').eq('id', currentUser.id).maybeSingle(),
      client.from('trainer_progress')
        .select('trainer_key,metrics,last_activity_at,updated_at')
        .eq('user_id', currentUser.id)
    ]);

    if (error) console.error('Poker101Class dashboard load failed:', error.message);

    const displayName = profile?.display_name || currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'Dealer';
    const welcome = document.getElementById('member-welcome');
    if (welcome) welcome.textContent = 'Welcome back, ' + displayName + '.';

    const rows = Array.isArray(progress) ? progress : [];
    const byKey = Object.fromEntries(rows.map(r => [r.trainer_key, r]));
    const cards = document.getElementById('member-progress-cards');

    if (cards) {
      cards.innerHTML = Object.entries(trainers).map(([key, config]) => {
        const row = byKey[key];
        const s = row?.metrics?.summary || {};
        const started = Number(s.questions || 0) > 0;
        const href = config.href;
        return `<a class="member-progress-card" href="${href}">
          <span class="member-progress-number">${key === 'table-games' ? '01' : key === 'mental-math' ? '02' : '03'}</span>
          <div class="member-progress-card-head"><h3>${config.label}</h3><span>${started ? fmtDate(row.last_activity_at) : 'Not started'}</span></div>
          <div class="member-metrics">
            <div><b>${started ? (s.accuracy ?? 0) + '%' : '—'}</b><small>Accuracy</small></div>
            <div><b>${started ? (s.questions ?? 0) : '0'}</b><small>Answers</small></div>
            <div><b>${started ? (s.streak ?? 0) : '0'}</b><small>Streak</small></div>
            <div><b>${started && s.avg_response_ms ? fmtMs(s.avg_response_ms) : '—'}</b><small>Avg response</small></div>
          </div>
          <span class="member-card-link">${started ? 'Continue training' : 'Start trainer'} ↗</span>
        </a>`;
      }).join('');
    }

    const startedRows = rows
      .filter(r => Number(r?.metrics?.summary?.questions || 0) > 0)
      .sort((a,b) => new Date(b.last_activity_at || 0) - new Date(a.last_activity_at || 0));

    let totalQuestions = 0;
    let totalCorrect = 0;
    rows.forEach(r => {
      const s = r?.metrics?.summary || {};
      totalQuestions += Number(s.questions) || 0;
      totalCorrect += Number(s.correct) || 0;
    });

    const overall = document.getElementById('member-overall-accuracy');
    const total = document.getElementById('member-total-answers');
    if (overall) overall.textContent = totalQuestions ? Math.round(totalCorrect / totalQuestions * 100) + '%' : '—';
    if (total) total.textContent = String(totalQuestions);

    const continueBtn = document.getElementById('continue-training');
    if (continueBtn) {
      const latest = startedRows[0];
      const key = latest?.trainer_key || 'table-games';
      continueBtn.href = trainers[key].href;
      continueBtn.innerHTML = latest ? `Continue ${trainers[key].label} <span aria-hidden="true">↗</span>` : 'Start your first session <span aria-hidden="true">↗</span>';
    }
  }

  function dialog() { return document.getElementById('auth-dialog'); }
  function authMessage(text, isError = false) {
    const el = document.getElementById('auth-message');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('error', !!isError);
  }

  function showAuth(mode = 'signin') {
    const dlg = dialog();
    if (!dlg) return;
    document.querySelectorAll('[data-auth-panel]').forEach(panel => {
      panel.hidden = panel.dataset.authPanel !== mode;
    });
    document.querySelectorAll('[data-auth-tab]').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.authTab === mode);
    });
    authMessage('');
    if (!dlg.open) dlg.showModal();
  }

  function closeAuth() {
    const dlg = dialog();
    if (dlg?.open) dlg.close();
  }

  async function signUp(form) {
    const fd = new FormData(form);
    const displayName = String(fd.get('display_name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');

    authMessage('Creating your account…');

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: location.origin + location.pathname
      }
    });

    if (error) {
      authMessage(error.message, true);
      return;
    }

    if (data.session) {
      authMessage('Account created. You are signed in.');
      setTimeout(closeAuth, 600);
    } else {
      authMessage('Account created. Check your email to confirm it, then come back and sign in.');
    }
  }

  async function signIn(form) {
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');

    authMessage('Signing you in…');

    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      authMessage(error.message, true);
      return;
    }

    authMessage('Signed in.');
    setTimeout(closeAuth, 400);
  }

  async function signOut() {
    await client.auth.signOut();
  }

  function wireHomepageAuth() {
    document.querySelectorAll('[data-open-auth]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        showAuth(el.dataset.openAuth || 'signin');
      });
    });
    document.querySelectorAll('[data-auth-tab]').forEach(el => {
      el.addEventListener('click', () => showAuth(el.dataset.authTab));
    });
    document.querySelectorAll('[data-sign-out]').forEach(el => {
      el.addEventListener('click', async e => {
        e.preventDefault();
        await signOut();
      });
    });

    const signInForm = document.getElementById('sign-in-form');
    const signUpForm = document.getElementById('sign-up-form');
    if (signInForm) signInForm.addEventListener('submit', e => { e.preventDefault(); signIn(signInForm); });
    if (signUpForm) signUpForm.addEventListener('submit', e => { e.preventDefault(); signUp(signUpForm); });

    const close = document.getElementById('auth-close');
    if (close) close.addEventListener('click', closeAuth);
    const dlg = dialog();
    if (dlg) dlg.addEventListener('click', e => {
      if (e.target === dlg) closeAuth();
    });
  }

  async function refreshAuthState(session) {
    currentUser = session?.user || null;
    setAuthControls(currentUser);
    await Promise.all([
      renderMemberDashboard(),
      restoreOrSyncCurrentTrainer()
    ]);
  }

  wireHomepageAuth();

  client.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => refreshAuthState(session), 0);
  });

  client.auth.getSession().then(({ data }) => refreshAuthState(data.session));

  window.Poker101Account = {
    client,
    get user() { return currentUser; },
    showAuth,
    signOut,
    saveTrainerProgress,
    renderMemberDashboard
  };
})();