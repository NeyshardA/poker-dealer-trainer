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
  let currentProfile = null;
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

  const nativeSetItem = Storage.prototype.setItem;
  const SYNC_META_PREFIX = 'p101-sync-meta:';
  let deviceId = localStorage.getItem('p101-device-id');
  if (!deviceId) {
    deviceId = globalThis.crypto?.randomUUID?.() || 'device-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    nativeSetItem.call(localStorage, 'p101-device-id', deviceId);
  }

  function syncMetaKey(trainerKey) {
    return SYNC_META_PREFIX + trainerKey;
  }

  function readSyncMeta(trainerKey) {
    return safeParse(localStorage.getItem(syncMetaKey(trainerKey))) || {
      local_updated_at: 0,
      last_cloud_updated_at: 0,
      dirty: false,
      initialized: false
    };
  }

  function writeSyncMeta(trainerKey, patch) {
    const next = { ...readSyncMeta(trainerKey), ...patch };
    nativeSetItem.call(localStorage, syncMetaKey(trainerKey), JSON.stringify(next));
    return next;
  }

  function ensureSyncStatus() {
    const current = trainerForPage();
    if (!current) return null;
    let el = document.querySelector('.p101-cloud-status');
    if (el) return el;
    const host = document.querySelector('.p101-trainer-title');
    if (!host) return null;
    el = document.createElement('span');
    el.className = 'p101-cloud-status';
    el.setAttribute('aria-live', 'polite');
    host.appendChild(el);
    return el;
  }

  function setSyncStatus(state, text) {
    const el = ensureSyncStatus();
    if (!el) return;
    el.dataset.state = state;
    el.textContent = text;
  }

  function localTimestamp(trainerKey, raw) {
    const meta = readSyncMeta(trainerKey);
    if (meta.initialized) return Number(meta.local_updated_at) || 0;
    return Number(meta.local_updated_at) || Number(raw?.savedAt) || 0;
  }

  function cloudTimestamp(row) {
    const value = row?.last_activity_at || row?.updated_at;
    const ms = value ? Date.parse(value) : 0;
    return Number.isFinite(ms) ? ms : 0;
  }

  function markLocalDirty(trainerKey) {
    const now = Date.now();
    writeSyncMeta(trainerKey, { local_updated_at: now, dirty: true, initialized: true });
    if (!navigator.onLine) setSyncStatus('offline', 'Offline · will sync');
    else if (currentUser) setSyncStatus('syncing', 'Syncing…');
    else setSyncStatus('browser', 'Browser only');
    return now;
  }

  async function saveTrainerProgress(trainerKey, raw, options = {}) {
    if (!currentUser || !trainers[trainerKey] || !raw) return { skipped: true };
    const config = trainers[trainerKey];
    const summary = config.summarize(raw);
    if (!meaningful(summary)) return { skipped: true };
    if (!navigator.onLine) {
      writeSyncMeta(trainerKey, { dirty: true });
      setSyncStatus('offline', 'Offline · will sync');
      return { offline: true };
    }

    const meta = readSyncMeta(trainerKey);
    const localUpdatedAt = Number(options.localUpdatedAt) || localTimestamp(trainerKey, raw) || Date.now();
    setSyncStatus('syncing', 'Syncing…');

    const payload = {
      user_id: currentUser.id,
      trainer_key: trainerKey,
      metrics: {
        summary,
        raw,
        storage_key: config.storageKey,
        schema_version: 2,
        sync: {
          client_updated_at: new Date(localUpdatedAt).toISOString(),
          device_id: deviceId
        }
      },
      last_activity_at: new Date(localUpdatedAt).toISOString()
    };

    const { data, error } = await client
      .from('trainer_progress')
      .upsert(payload, { onConflict: 'user_id,trainer_key' })
      .select('metrics,last_activity_at,updated_at')
      .single();

    if (error) {
      writeSyncMeta(trainerKey, { dirty: true });
      setSyncStatus('error', 'Sync problem');
      console.error('Poker101Class progress sync failed:', error.message);
      return { error };
    }

    const storedTime = cloudTimestamp(data);
    if (storedTime > localUpdatedAt + 1000) {
      const cloudRaw = data?.metrics?.raw;
      if (cloudRaw && meaningful(data?.metrics?.summary)) {
        suppressProgressSync = true;
        nativeSetItem.call(localStorage, config.storageKey, JSON.stringify(cloudRaw));
        suppressProgressSync = false;
        writeSyncMeta(trainerKey, {
          local_updated_at: storedTime,
          last_cloud_updated_at: storedTime,
          dirty: false
        });
        setSyncStatus('saved', 'Cloud version restored');
        const reloadKey = 'p101-restored-' + trainerKey + '-' + storedTime;
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, '1');
          location.reload();
        }
        return { restored: true };
      }
    }

    writeSyncMeta(trainerKey, {
      local_updated_at: Math.max(localUpdatedAt, storedTime),
      last_cloud_updated_at: storedTime || localUpdatedAt,
      dirty: false,
      initialized: true
    });
    setSyncStatus('saved', 'Saved to account');
    return { saved: true };
  }

  function normalizedProgressSignature(value) {
    const raw = safeParse(value);
    if (!raw || typeof raw !== 'object') return String(value ?? '');
    const clone = Array.isArray(raw) ? [...raw] : { ...raw };
    if (!Array.isArray(clone)) delete clone.savedAt;
    try { return JSON.stringify(clone); } catch { return String(value ?? ''); }
  }

  function scheduleProgressSync(storageKey, value, previousValue = null) {
    const current = trainerForPage();
    if (!current || suppressProgressSync) return;
    const [trainerKey, config] = current;
    if (storageKey !== config.storageKey) return;
    const raw = safeParse(value);
    if (!raw) return;

    const sameMeaningfulData = normalizedProgressSignature(previousValue) === normalizedProgressSignature(value);
    if (sameMeaningfulData) {
      const meta = readSyncMeta(trainerKey);
      if (!meta.initialized) {
        const previousRaw = safeParse(previousValue);
        writeSyncMeta(trainerKey, {
          local_updated_at: Number(previousRaw?.savedAt) || 0,
          dirty: false,
          initialized: true
        });
      }
      return;
    }

    const localUpdatedAt = markLocalDirty(trainerKey);
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => saveTrainerProgress(trainerKey, raw, { localUpdatedAt }), 650);
  }

  Storage.prototype.setItem = function(key, value) {
    const previousValue = this === window.localStorage ? this.getItem(String(key)) : null;
    nativeSetItem.call(this, key, value);
    if (this === window.localStorage) scheduleProgressSync(String(key), String(value), previousValue);
  };

  async function restoreOrSyncCurrentTrainer() {
    const current = trainerForPage();
    if (!current) return;
    const [trainerKey, config] = current;

    if (!currentUser) {
      setSyncStatus('browser', 'Browser only');
      return;
    }
    if (!navigator.onLine) {
      setSyncStatus('offline', 'Offline · will sync');
      return;
    }

    setSyncStatus('syncing', 'Checking cloud…');

    const localRaw = safeParse(localStorage.getItem(config.storageKey));
    const localSummary = config.summarize(localRaw || {});
    const meta = readSyncMeta(trainerKey);

    const { data, error } = await client
      .from('trainer_progress')
      .select('metrics,last_activity_at,updated_at')
      .eq('user_id', currentUser.id)
      .eq('trainer_key', trainerKey)
      .maybeSingle();

    if (error) {
      setSyncStatus('error', 'Sync problem');
      console.error('Poker101Class cloud progress load failed:', error.message);
      return;
    }

    const cloudRaw = data?.metrics?.raw;
    const cloudSummary = data?.metrics?.summary;
    const localHasProgress = meaningful(localSummary);
    const cloudHasProgress = cloudRaw && meaningful(cloudSummary);
    const localTime = localTimestamp(trainerKey, localRaw);
    const cloudTime = cloudTimestamp(data);

    if (!localHasProgress && cloudHasProgress) {
      suppressProgressSync = true;
      nativeSetItem.call(localStorage, config.storageKey, JSON.stringify(cloudRaw));
      suppressProgressSync = false;
      writeSyncMeta(trainerKey, {
        local_updated_at: cloudTime,
        last_cloud_updated_at: cloudTime,
        dirty: false,
        initialized: true
      });
      setSyncStatus('saved', 'Progress restored');
      const reloadKey = 'p101-restored-' + trainerKey + '-' + cloudTime;
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        location.reload();
      }
      return;
    }

    if (localHasProgress && !cloudHasProgress) {
      const inferred = localTime || Date.now();
      writeSyncMeta(trainerKey, { local_updated_at: inferred, dirty: true });
      await saveTrainerProgress(trainerKey, localRaw, { localUpdatedAt: inferred });
      return;
    }

    if (!localHasProgress && !cloudHasProgress) {
      writeSyncMeta(trainerKey, { dirty: false, last_cloud_updated_at: 0 });
      setSyncStatus('saved', 'Account connected');
      return;
    }

    const localQuestions = Number(localSummary?.questions) || 0;
    const cloudQuestions = Number(cloudSummary?.questions) || 0;
    let effectiveLocalTime = localTime;

    // Legacy browser data may predate sync metadata. Preserve it when it
    // clearly contains more accumulated work than the cloud copy.
    if (!effectiveLocalTime && localQuestions > cloudQuestions) {
      effectiveLocalTime = Date.now();
      writeSyncMeta(trainerKey, { local_updated_at: effectiveLocalTime, dirty: true });
    }

    if ((meta.dirty && effectiveLocalTime >= cloudTime) || effectiveLocalTime > cloudTime) {
      await saveTrainerProgress(trainerKey, localRaw, { localUpdatedAt: effectiveLocalTime || Date.now() });
      return;
    }

    if (cloudTime > effectiveLocalTime) {
      suppressProgressSync = true;
      nativeSetItem.call(localStorage, config.storageKey, JSON.stringify(cloudRaw));
      suppressProgressSync = false;
      writeSyncMeta(trainerKey, {
        local_updated_at: cloudTime,
        last_cloud_updated_at: cloudTime,
        dirty: false,
        initialized: true
      });
      setSyncStatus('saved', 'Newer cloud progress restored');
      const reloadKey = 'p101-restored-' + trainerKey + '-' + cloudTime;
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        location.reload();
      }
      return;
    }

    writeSyncMeta(trainerKey, {
      local_updated_at: Math.max(effectiveLocalTime, cloudTime),
      last_cloud_updated_at: cloudTime,
      dirty: false,
      initialized: true
    });
    setSyncStatus('saved', 'Saved to account');
  }

  async function syncCurrentTrainerIfDirty() {
    if (!currentUser) return;
    const current = trainerForPage();
    if (!current) return;
    const [trainerKey, config] = current;
    const meta = readSyncMeta(trainerKey);
    const raw = safeParse(localStorage.getItem(config.storageKey));
    if (meta.dirty && raw && meaningful(config.summarize(raw))) {
      await saveTrainerProgress(trainerKey, raw, { localUpdatedAt: meta.local_updated_at || Date.now() });
    } else {
      await restoreOrSyncCurrentTrainer();
    }
  }

  function pendingSessionsKey() {
    return currentUser ? 'p101-pending-sessions:' + currentUser.id : null;
  }

  function readPendingSessions() {
    const key = pendingSessionsKey();
    if (!key) return [];
    const rows = safeParse(localStorage.getItem(key));
    return Array.isArray(rows) ? rows : [];
  }

  function writePendingSessions(rows) {
    const key = pendingSessionsKey();
    if (!key) return;
    nativeSetItem.call(localStorage, key, JSON.stringify(rows.slice(-100)));
  }

  function queuePendingSession(payload) {
    if (!currentUser) return;
    const rows = readPendingSessions();
    if (!rows.some(row => row.client_session_id === payload.client_session_id)) rows.push(payload);
    writePendingSessions(rows);
  }

  async function persistSessionPayload(payload) {
    const { error } = await client
      .from('training_sessions')
      .upsert(payload, { onConflict: 'user_id,client_session_id', ignoreDuplicates: true });

    if (error) return { error };
    return { saved: true };
  }

  async function flushPendingSessions() {
    if (!currentUser || !navigator.onLine) return;
    const rows = readPendingSessions();
    if (!rows.length) return;

    const remaining = [];
    for (const payload of rows) {
      const result = await persistSessionPayload(payload);
      if (result.error) remaining.push(payload);
    }
    writePendingSessions(remaining);
  }

  async function recordTrainingSession(trainerKey, details = {}) {
    if (!currentUser || !trainers[trainerKey]) return { skipped: true };

    const totalQuestions = Math.max(0, Number(details.total_questions) || 0);
    const correctAnswers = Math.max(0, Math.min(totalQuestions, Number(details.correct_answers) || 0));
    if (!totalQuestions) return { skipped: true };

    const clientSessionId = String(details.client_session_id || globalThis.crypto?.randomUUID?.() || (trainerKey + '-' + Date.now() + '-' + Math.random().toString(16).slice(2)));
    const payload = {
      user_id: currentUser.id,
      trainer_key: trainerKey,
      client_session_id: clientSessionId,
      mode: details.mode ? String(details.mode) : null,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      duration_ms: details.duration_ms == null ? null : Math.max(0, Math.round(Number(details.duration_ms) || 0)),
      avg_response_ms: details.avg_response_ms == null ? null : Math.max(0, Number(details.avg_response_ms) || 0),
      metadata: details.metadata && typeof details.metadata === 'object' ? details.metadata : {}
    };

    if (!navigator.onLine) {
      queuePendingSession(payload);
      return { offline: true, queued: true };
    }

    const result = await persistSessionPayload(payload);
    if (result.error) {
      queuePendingSession(payload);
      console.error('Poker101Class session history save failed:', result.error.message);
      return result;
    }

    return { saved: true, client_session_id: clientSessionId };
  }

  window.addEventListener('online', () => {
    setTimeout(async () => {
      await syncCurrentTrainerIfDirty();
      await flushPendingSessions();
    }, 150);
  });
  window.addEventListener('offline', () => {
    if (trainerForPage()) setSyncStatus('offline', currentUser ? 'Offline · will sync' : 'Browser only');
  });

  function getPreferredName(user) {
    return (
      currentProfile?.display_name ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.nickname ||
      user?.email?.split('@')[0] ||
      'Account'
    );
  }

  function setAuthControls(user) {
    document.querySelectorAll('[data-auth-guest]').forEach(el => el.hidden = !!user);
    document.querySelectorAll('[data-auth-user]').forEach(el => el.hidden = !user);

    const preferredName = user ? getPreferredName(user) : '';
    document.querySelectorAll('[data-account-name]').forEach(el => {
      el.textContent = preferredName;
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
    if (!section || !currentUser) return;

    const [{ data: profile }, { data: progress, error }, { data: entitlement }, { data: recentSessions, error: sessionsError }, { count: sessionCount }] = await Promise.all([
      client.from('profiles').select('display_name').eq('id', currentUser.id).maybeSingle(),
      client.from('trainer_progress')
        .select('trainer_key,metrics,last_activity_at,updated_at')
        .eq('user_id', currentUser.id),
      client.from('account_entitlements').select('plan,status,current_period_end').eq('user_id', currentUser.id).maybeSingle(),
      client.from('training_sessions')
        .select('trainer_key,mode,total_questions,correct_answers,duration_ms,avg_response_ms,metadata,created_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(8),
      client.from('training_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
    ]);

    if (error) console.error('Poker101Class dashboard load failed:', error.message);
    if (sessionsError) console.error('Poker101Class session history load failed:', sessionsError.message);

    currentProfile = profile || null;
    setAuthControls(currentUser);

    const displayName = getPreferredName(currentUser);
    const welcome = document.getElementById('member-welcome');
    if (welcome) welcome.textContent = 'Welcome back, ' + displayName + '.';

    const nameInput = document.getElementById('account-display-name');
    const emailInput = document.getElementById('account-email');
    const verificationStatus = document.getElementById('email-verification-status');
    const resendVerification = document.getElementById('resend-verification');
    if (nameInput) nameInput.value = displayName;
    if (emailInput) emailInput.value = currentUser.email || '';
    const emailVerified = !!currentUser.email_confirmed_at;
    if (verificationStatus) {
      verificationStatus.textContent = emailVerified ? 'Verified' : 'Not verified';
      verificationStatus.classList.toggle('verified', emailVerified);
      verificationStatus.classList.toggle('unverified', !emailVerified);
    }
    if (resendVerification) resendVerification.hidden = emailVerified;

    const plan = document.getElementById('membership-plan');
    const status = document.getElementById('membership-status');
    if (plan) plan.textContent = entitlement?.plan ? entitlement.plan.charAt(0).toUpperCase() + entitlement.plan.slice(1) : 'Free';
    if (status) status.textContent = entitlement?.status ? entitlement.status.charAt(0).toUpperCase() + entitlement.status.slice(1) : 'Active';

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

    const sessionCountEl = document.getElementById('member-session-count');
    if (sessionCountEl) {
      const n = Number(sessionCount) || 0;
      sessionCountEl.textContent = n + (n === 1 ? ' session' : ' sessions');
    }

    const recentList = document.getElementById('recent-session-list');
    if (recentList) {
      const rows = Array.isArray(recentSessions) ? recentSessions : [];
      recentList.innerHTML = rows.length ? rows.map(row => {
        const config = trainers[row.trainer_key] || { label: row.trainer_key || 'Trainer', href: '#' };
        const total = Number(row.total_questions) || 0;
        const correct = Number(row.correct_answers) || 0;
        const accuracy = total ? Math.round(correct / total * 100) : 0;
        const duration = Number(row.duration_ms) || 0;
        const durationText = duration >= 60000
          ? Math.max(1, Math.round(duration / 60000)) + ' min'
          : duration > 0 ? Math.max(1, Math.round(duration / 1000)) + ' sec' : '—';
        return `<a class="recent-session-row" href="${config.href}">
          <div class="recent-session-main">
            <span>${config.label}</span>
            <strong>${row.mode || 'Training session'}</strong>
            <small>${fmtDate(row.created_at)} · ${durationText}</small>
          </div>
          <div class="recent-session-score">
            <b>${accuracy}%</b>
            <small>${correct}/${total}</small>
          </div>
        </a>`;
      }).join('') : '<div class="recent-session-empty">Complete a signed-in training session and it will appear here.</div>';
    }
  }

  function accountDialog() {
    return document.getElementById('account-center');
  }

  function switchAccountPanel(view = 'progress') {
    document.querySelectorAll('[data-account-panel]').forEach(panel => {
      panel.hidden = panel.dataset.accountPanel !== view;
    });
    document.querySelectorAll('[data-account-tab]').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.accountTab === view);
    });
  }

  async function openAccount(view = 'progress') {
    if (!currentUser) {
      showAuth('signin');
      return;
    }
    switchAccountPanel(view);
    await renderMemberDashboard();
    const dlg = accountDialog();
    if (dlg && !dlg.open) dlg.showModal();
  }

  function closeAccount() {
    const dlg = accountDialog();
    if (dlg?.open) dlg.close();
  }

  async function saveAccountSettings(form) {
    if (!currentUser) return;
    const fd = new FormData(form);
    const displayName = String(fd.get('display_name') || '').trim();
    const msg = document.getElementById('account-settings-message');
    if (!displayName) {
      if (msg) msg.textContent = 'Enter a display name.';
      return;
    }

    if (msg) msg.textContent = 'Saving…';
    const { data, error } = await client
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', currentUser.id)
      .select('display_name')
      .single();

    if (error) {
      if (msg) msg.textContent = error.message;
      return;
    }

    currentProfile = data || { display_name: displayName };
    setAuthControls(currentUser);
    const welcome = document.getElementById('member-welcome');
    if (welcome) welcome.textContent = 'Welcome back, ' + getPreferredName(currentUser) + '.';
    if (msg) msg.textContent = 'Display name updated.';
  }

  const authDialogIds = {
    signin: 'sign-in-dialog',
    signup: 'sign-up-dialog',
    forgot: 'forgot-password-dialog',
    recovery: 'recovery-password-dialog'
  };
  let activeAuthMode = 'signin';

  function authDialog(mode = activeAuthMode) {
    return document.getElementById(authDialogIds[mode] || authDialogIds.signin);
  }

  function authMessage(text, isError = false, mode = activeAuthMode) {
    const el = document.querySelector(`[data-auth-message="${mode}"]`);
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('error', !!isError);
  }

  function closeAuth(exceptMode = null) {
    Object.keys(authDialogIds).forEach(mode => {
      if (mode === exceptMode) return;
      const dlg = authDialog(mode);
      if (dlg?.open) dlg.close();
    });
  }

  function showAuth(mode = 'signin') {
    if (!authDialogIds[mode]) mode = 'signin';
    closeAuth(mode);
    activeAuthMode = mode;
    authMessage('', false, mode);
    const dlg = authDialog(mode);
    if (dlg && !dlg.open) dlg.showModal();
  }

  async function signUp(form) {
    const fd = new FormData(form);
    const displayName = String(fd.get('display_name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');

    authMessage('Creating your account…', false, 'signup');

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: location.origin + location.pathname
      }
    });

    if (error) {
      authMessage(error.message, true, 'signup');
      return;
    }

    if (data.session) {
      authMessage('Account created. You are signed in.', false, 'signup');
      setTimeout(() => closeAuth(), 600);
    } else {
      authMessage('Account created. Check your email to confirm it, then come back and sign in.', false, 'signup');
    }
  }

  async function signIn(form) {
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');

    authMessage('Signing you in…', false, 'signin');

    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      authMessage(error.message, true, 'signin');
      return;
    }

    authMessage('Signed in.', false, 'signin');
    setTimeout(() => closeAuth(), 400);
  }

  async function requestPasswordReset(form) {
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim();
    if (!email) return;

    authMessage('Sending reset link…', false, 'forgot');
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname
    });

    if (error) {
      authMessage(error.message, true, 'forgot');
      return;
    }

    authMessage('If an account exists for that email, a password reset link has been sent.', false, 'forgot');
    form.reset();
  }

  async function completeRecovery(form) {
    const fd = new FormData(form);
    const password = String(fd.get('password') || '');
    const confirmPassword = String(fd.get('confirm_password') || '');

    if (password.length < 8) {
      authMessage('Your new password must be at least 8 characters.', true, 'recovery');
      return;
    }
    if (password !== confirmPassword) {
      authMessage('The passwords do not match.', true, 'recovery');
      return;
    }

    authMessage('Updating your password…', false, 'recovery');
    const { error } = await client.auth.updateUser({ password });

    if (error) {
      authMessage(error.message, true, 'recovery');
      return;
    }

    form.reset();
    authMessage('Password updated successfully. You are signed in.', false, 'recovery');
    if (location.hash || location.search.includes('type=recovery')) {
      history.replaceState({}, document.title, location.pathname);
    }
    setTimeout(() => closeAuth(), 900);
  }

  async function changePassword(form) {
    if (!currentUser?.email) return;

    const fd = new FormData(form);
    const currentPassword = String(fd.get('current_password') || '');
    const newPassword = String(fd.get('new_password') || '');
    const confirmPassword = String(fd.get('confirm_password') || '');
    const msg = document.getElementById('password-settings-message');

    if (newPassword.length < 8) {
      if (msg) msg.textContent = 'Your new password must be at least 8 characters.';
      return;
    }
    if (newPassword !== confirmPassword) {
      if (msg) msg.textContent = 'The new passwords do not match.';
      return;
    }
    if (currentPassword === newPassword) {
      if (msg) msg.textContent = 'Choose a new password that is different from your current password.';
      return;
    }

    if (msg) msg.textContent = 'Checking your current password…';
    const { error: signInError } = await client.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPassword
    });

    if (signInError) {
      if (msg) msg.textContent = 'Your current password is incorrect.';
      return;
    }

    if (msg) msg.textContent = 'Updating password…';
    const { error } = await client.auth.updateUser({ password: newPassword });

    if (error) {
      if (msg) msg.textContent = error.message;
      return;
    }

    form.reset();
    if (msg) msg.textContent = 'Password changed successfully.';
  }

  async function resendVerificationEmail() {
    if (!currentUser?.email || currentUser.email_confirmed_at) return;
    const button = document.getElementById('resend-verification');
    const msg = document.getElementById('account-settings-message');

    if (button) button.disabled = true;
    if (msg) msg.textContent = 'Sending verification email…';

    const { error } = await client.auth.resend({
      type: 'signup',
      email: currentUser.email,
      options: { emailRedirectTo: location.origin + location.pathname }
    });

    if (button) button.disabled = false;
    if (msg) msg.textContent = error ? error.message : 'Verification email sent.';
  }

  async function signOut() {
    closeAccount();
    document.querySelectorAll('.account-menu[open]').forEach(menu => menu.removeAttribute('open'));
    await client.auth.signOut();
  }

  function wireHomepageAuth() {
    document.querySelectorAll('[data-open-auth]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        showAuth(el.dataset.openAuth || 'signin');
      });
    });
    document.querySelectorAll('[data-sign-out]').forEach(el => {
      el.addEventListener('click', async e => {
        e.preventDefault();
        await signOut();
      });
    });

    document.querySelectorAll('[data-account-view]').forEach(el => {
      el.addEventListener('click', async e => {
        e.preventDefault();
        const menu = el.closest('.account-menu');
        if (menu) menu.removeAttribute('open');
        await openAccount(el.dataset.accountView || 'progress');
      });
    });
    document.querySelectorAll('[data-account-tab]').forEach(el => {
      el.addEventListener('click', () => switchAccountPanel(el.dataset.accountTab || 'progress'));
    });

    const signInForm = document.getElementById('sign-in-form');
    const signUpForm = document.getElementById('sign-up-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const recoveryPasswordForm = document.getElementById('recovery-password-form');
    if (signInForm) signInForm.addEventListener('submit', e => { e.preventDefault(); signIn(signInForm); });
    if (signUpForm) signUpForm.addEventListener('submit', e => { e.preventDefault(); signUp(signUpForm); });
    if (forgotPasswordForm) forgotPasswordForm.addEventListener('submit', e => { e.preventDefault(); requestPasswordReset(forgotPasswordForm); });
    if (recoveryPasswordForm) recoveryPasswordForm.addEventListener('submit', e => { e.preventDefault(); completeRecovery(recoveryPasswordForm); });

    const accountSettingsForm = document.getElementById('account-settings-form');
    if (accountSettingsForm) accountSettingsForm.addEventListener('submit', e => {
      e.preventDefault();
      saveAccountSettings(accountSettingsForm);
    });
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) changePasswordForm.addEventListener('submit', e => {
      e.preventDefault();
      changePassword(changePasswordForm);
    });
    const resendVerification = document.getElementById('resend-verification');
    if (resendVerification) resendVerification.addEventListener('click', resendVerificationEmail);

    const accountClose = document.getElementById('account-center-close');
    if (accountClose) accountClose.addEventListener('click', closeAccount);
    const accountDlg = accountDialog();
    if (accountDlg) accountDlg.addEventListener('click', e => {
      if (e.target === accountDlg) closeAccount();
    });
    document.querySelectorAll('[data-auth-close]').forEach(button => {
      button.addEventListener('click', () => closeAuth());
    });
    Object.keys(authDialogIds).forEach(mode => {
      const dlg = authDialog(mode);
      if (dlg) dlg.addEventListener('click', e => {
        if (e.target === dlg) closeAuth();
      });
    });
  }

  async function refreshAuthState(session) {
    currentUser = session?.user || null;
    if (!currentUser) currentProfile = null;
    setAuthControls(currentUser);
    await Promise.all([
      renderMemberDashboard(),
      restoreOrSyncCurrentTrainer(),
      flushPendingSessions()
    ]);
  }

  wireHomepageAuth();

  client.auth.onAuthStateChange((event, session) => {
    setTimeout(async () => {
      await refreshAuthState(session);
      if (event === 'PASSWORD_RECOVERY') showAuth('recovery');
    }, 0);
  });

  client.auth.getSession().then(({ data }) => refreshAuthState(data.session));

  window.Poker101Account = {
    client,
    get user() { return currentUser; },
    showAuth,
    signOut,
    saveTrainerProgress,
    recordTrainingSession,
    renderMemberDashboard
  };
})();