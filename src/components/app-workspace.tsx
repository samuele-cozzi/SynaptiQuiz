"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BrainCircuit,
  CircleHelp,
  Copy,
  Eye,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Moon,
  Pencil,
  Play,
  Plus,
  Search,
  Settings,
  Sun,
  Tags,
  Trash2,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/lib/messages";
import { messages } from "@/lib/messages";
import type { AppSnapshot, GameRecord, LeaderboardEntry } from "@/lib/types";

type WorkspaceProps = {
  locale: Locale;
  snapshot: AppSnapshot;
  view: string;
  setView: (view: string) => void;
  gameId: string | null;
  setGameId: (id: string | null) => void;
  onMutation: (payload: Record<string, unknown>) => Promise<{ result: { id?: string }; data: AppSnapshot }>;
  onAnswer: (game: GameRecord, questionId: string, playerId: string, optionId: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onLocaleChange: (locale: Locale) => void;
  onThemeChange: (theme: string) => void;
  online: boolean;
  pendingCount: number;
};

type Dialog =
  | { kind: "game"; game: GameRecord | null }
  | { kind: "duplicate"; game: GameRecord }
  | { kind: "question"; question: AppSnapshot["questions"][number] | null }
  | { kind: "topic"; topic: AppSnapshot["topics"][number] | null }
  | { kind: "player"; player: AppSnapshot["users"][number] }
  | null;

const navIcons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  games: Gamepad2,
  questions: CircleHelp,
  topics: Tags,
  players: Users,
  leaderboard: Trophy,
  options: Settings,
};

function Avatar({ username, url }: { username: string; url?: string | null }) {
  return (
    <span
      className="avatar"
      aria-label={username}
      style={url ? { backgroundImage: `url(${url})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}
    >
      {!url && username.slice(0, 1).toUpperCase()}
    </span>
  );
}

function StatusPill({ status, label }: { status: GameRecord["status"]; label: string }) {
  return <span className={`status-pill ${status}`}>{label}</span>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><strong>{title}</strong>{description}</div>;
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
      {action && <div className="heading-actions">{action}</div>}
    </div>
  );
}

function LeaderPreview({ entries, onView, title }: { entries: LeaderboardEntry[]; onView: () => void; title: string }) {
  return (
    <section className="panel">
      <div className="panel-heading"><div><h2>{title}</h2><p>Top players · all completed games</p></div><button className="quiet-button" type="button" onClick={onView}>View all <Trophy size={14} /></button></div>
      <div className="panel-body">
        {entries.length ? <div className="leader-list">{entries.slice(0, 5).map((entry) => (
          <div className="leader-row" key={entry.id}>
            <span className="rank-number">{String(entry.rank).padStart(2, "0")}</span>
            <span className="leader-name"><strong>{entry.username}</strong><span>{entry.wins} wins</span></span>
            <span className="leader-points">{entry.points} pts</span>
          </div>
        ))}</div> : <EmptyState title="No scores yet" description="Finish a game to appear here." />}
      </div>
    </section>
  );
}

function GameListRow({
  game,
  locale,
  canManage,
  currentUserId,
  onView,
  onPlay,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  game: GameRecord;
  locale: Locale;
  canManage: boolean;
  currentUserId: string;
  onView: () => void;
  onPlay: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const t = messages[locale];
  const canPlay = game.status !== "completed" && (game.creator.id === currentUserId || game.players.some((player) => player.id === currentUserId));
  return (
    <div className="game-row">
      <div className="game-title"><strong>{game.name}</strong><span>{game.creator.username} · {game.players.length} {t.playersLabel.toLowerCase()}</span></div>
      <div className="game-meta"><span>{game.questions.length} {t.questionsLabel.toLowerCase()}</span><StatusPill status={game.status} label={t[game.status === "in_progress" ? "inProgress" : game.status]} /></div>
      <div className="table-actions">
        <button className="quiet-button" type="button" onClick={onView} title={t.inspect}><Eye size={14} /><span className="desktop-action">{t.inspect}</span></button>
        {canPlay && <button className="quiet-button" type="button" onClick={onPlay} title={t.play}><Play size={14} /><span className="desktop-action">{t.play}</span></button>}
        <button className="quiet-button" type="button" onClick={onDuplicate} title={t.duplicate}><Copy size={14} /></button>
        {canManage && game.status === "draft" && <button className="quiet-button" type="button" onClick={onEdit} title={t.edit}><Pencil size={14} /></button>}
        {canManage && <button className="quiet-button" type="button" onClick={onDelete} title={t.delete}><Trash2 size={14} /></button>}
      </div>
    </div>
  );
}

export function AppWorkspace(props: WorkspaceProps) {
  const {
    locale, snapshot, view, setView, gameId, setGameId, onMutation, onAnswer,
    onLogout, onLocaleChange, onThemeChange, online, pendingCount,
  } = props;
  const t = messages[locale];
  const { user } = snapshot;
  const canManageContent = user.role === "admin" || user.role === "editor";
  const isAdmin = user.role === "admin";
  const [dialog, setDialog] = useState<Dialog>(null);
  const [filterText, setFilterText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [notice, setNotice] = useState("");

  async function submitMutation(payload: Record<string, unknown>) {
    setNotice("");
    try {
      const response = await onMutation(payload);
      setDialog(null);
      setNotice(locale === "it" ? "Modifiche salvate." : "Changes saved.");
      return response;
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : t.networkError);
      return null;
    }
  }

  function showGame(game: GameRecord) {
    setGameId(game.id);
    setView("game");
  }

  const navigation = [
    { key: "dashboard", label: t.dashboard },
    { key: "games", label: t.games },
    ...(canManageContent ? [{ key: "questions", label: t.questions }, { key: "topics", label: t.topics }] : []),
    ...(isAdmin ? [{ key: "players", label: t.players }] : []),
    { key: "leaderboard", label: t.leaderboard },
    { key: "options", label: t.options },
  ];

  const visibleGames = snapshot.games.filter((game) => {
    const matchesText = game.name.toLowerCase().includes(filterText.toLowerCase());
    const matchesStatus = filterStatus === "all" || game.status === filterStatus;
    const matchesLanguage = filterLanguage === "all" || game.language === filterLanguage;
    return matchesText && matchesStatus && matchesLanguage;
  });
  const visibleQuestions = snapshot.questions.filter((question) => {
    const matchesText = question.variants.some((variant) => variant.text.toLowerCase().includes(filterText.toLowerCase()));
    const matchesTopic = filterTopic === "all" || question.topicId === filterTopic;
    const matchesDifficulty = filterDifficulty === "all" || String(question.difficulty) === filterDifficulty;
    const matchesLanguage = filterLanguage === "all" || question.variants.some((variant) => variant.language === filterLanguage);
    return matchesText && matchesTopic && matchesDifficulty && matchesLanguage;
  });
  const visiblePlayers = snapshot.users.filter((player) =>
    player.username.toLowerCase().includes(filterText.toLowerCase()) &&
    (filterRole === "all" || player.role === filterRole),
  );
  const dashboardGames = snapshot.games.filter((game) => snapshot.manageableGameIds.includes(game.id));

  async function deleteItem(action: string, id: string) {
    if (window.confirm(t.confirmDelete)) await submitMutation({ action, id });
  }

  async function changeTheme(theme: "light" | "dark") {
    onThemeChange(theme);
    await submitMutation({ action: "settings.update", locale, theme, defaultLanguage: user.defaultLanguage });
  }

  async function changeLanguage(nextLocale: Locale) {
    if (nextLocale === locale) return;
    const result = await submitMutation({
      action: "settings.update",
      locale: nextLocale,
      theme: user.theme,
      defaultLanguage: user.defaultLanguage,
    });
    if (result) onLocaleChange(nextLocale);
  }

  async function changeDefaultLanguage(language: Locale) {
    await submitMutation({ action: "settings.update", locale, theme: user.theme, defaultLanguage: language });
  }

  let page: ReactNode;
  if (view === "game" && gameId) {
    const game = snapshot.games.find((entry) => entry.id === gameId);
    page = game ? (
      <GamePlayView
        game={game}
        locale={locale}
        userId={user.id}
        online={online}
        pendingCount={pendingCount}
        onBack={() => { setGameId(null); setView("games"); }}
        onStart={() => submitMutation({ action: "game.start", id: game.id })}
        onAnswer={onAnswer}
      />
    ) : <EmptyState title={t.noGames} description={t.noGamesDescription} />;
  } else if (view === "dashboard") {
    page = (
      <>
        <SectionHeading eyebrow={t.dashboard} title={`${t.dashboardTitle}, ${user.username}`} description={t.dashboardDescription} />
        <div className="stats-grid">
          <StatCard label={t.points} value={snapshot.stats.points} icon={Trophy} suffix="pts" />
          <StatCard label={t.wins} value={snapshot.stats.wins} icon={Gamepad2} />
          <StatCard label={t.gamesPlayed} value={snapshot.stats.gamesPlayed} icon={CircleHelp} />
          <StatCard label={t.againstOthers} value={snapshot.stats.gamesAgainstOthers} icon={Users} />
        </div>
        <div className="dashboard-grid">
          <section className="panel">
            <div className="panel-heading"><div><h2>{t.recentGames}</h2><p>{dashboardGames.length} games in your workspace</p></div><button className="quiet-button" type="button" onClick={() => setView("games")}>{t.seeAll}</button></div>
            {dashboardGames.length ? <div className="game-list">{dashboardGames.slice(0, 5).map((game) => (
              <GameListRow key={game.id} game={game} locale={locale} canManage={canManageContent} currentUserId={user.id} onView={() => showGame(game)} onPlay={() => showGame(game)} onEdit={() => setDialog({ kind: "game", game })} onDuplicate={() => setDialog({ kind: "duplicate", game })} onDelete={() => void deleteItem("game.delete", game.id)} />
            ))}</div> : <EmptyState title={t.noGames} description={t.noGamesDescription} />}
          </section>
          <LeaderPreview entries={snapshot.leaderboard} title={t.globalLeaders} onView={() => setView("leaderboard")} />
        </div>
      </>
    );
  } else if (view === "games") {
    page = (
      <>
        <SectionHeading eyebrow={t.workspace} title={t.gamesTitle} description={t.gamesDescription} action={canManageContent ? <button className="primary-button" type="button" onClick={() => setDialog({ kind: "game", game: null })}><Plus size={16} />{t.newGame}</button> : undefined} />
        <div className="toolbar">
          <SearchBox value={filterText} onChange={setFilterText} placeholder={t.searchGames} />
          <select className="filter-select" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}><option value="all">{t.allStatuses}</option><option value="draft">{t.draft}</option><option value="in_progress">{t.inProgress}</option><option value="completed">{t.completed}</option></select>
          <select className="filter-select" value={filterLanguage} onChange={(event) => setFilterLanguage(event.target.value)}><option value="all">{t.allLanguages}</option><option value="en">{t.english}</option><option value="it">{t.italian}</option></select>
        </div>
        <section className="panel"><div className="game-list">
          {visibleGames.length ? visibleGames.map((game) => <GameListRow key={game.id} game={game} locale={locale} canManage={canManageContent} currentUserId={user.id} onView={() => showGame(game)} onPlay={() => showGame(game)} onEdit={() => setDialog({ kind: "game", game })} onDuplicate={() => setDialog({ kind: "duplicate", game })} onDelete={() => void deleteItem("game.delete", game.id)} />) : <EmptyState title={t.noGames} description={t.noGamesDescription} />}
        </div></section>
      </>
    );
  } else if (view === "questions" && canManageContent) {
    page = (
      <>
        <SectionHeading eyebrow={t.workspace} title={t.questionsTitle} description={t.questionsDescription} action={<button className="primary-button" type="button" onClick={() => setDialog({ kind: "question", question: null })}><Plus size={16} />{t.newQuestion}</button>} />
        <div className="toolbar">
          <SearchBox value={filterText} onChange={setFilterText} placeholder={t.searchQuestions} />
          <select className="filter-select" value={filterTopic} onChange={(event) => setFilterTopic(event.target.value)}><option value="all">{t.allTopics}</option>{snapshot.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.text}</option>)}</select>
          <select className="filter-select" value={filterDifficulty} onChange={(event) => setFilterDifficulty(event.target.value)}><option value="all">{t.allDifficulties}</option>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level}</option>)}</select>
          <select className="filter-select" value={filterLanguage} onChange={(event) => setFilterLanguage(event.target.value)}><option value="all">{t.allLanguages}</option><option value="en">{t.english}</option><option value="it">{t.italian}</option></select>
        </div>
        <section className="panel table-wrap"><table className="data-table"><thead><tr><th>{t.questionText}</th><th>{t.topics}</th><th>{t.difficulty}</th><th>{t.language}</th><th>{t.actions}</th></tr></thead><tbody>
          {visibleQuestions.map((question) => <tr key={question.id}><td><strong>{question.variants.find((variant) => variant.language === locale)?.text ?? question.variants[0]?.text}</strong></td><td>{question.topic.text}</td><td>{question.difficulty}/5</td><td>{question.variants.map((variant) => variant.language.toUpperCase()).join(" · ")}</td><td><div className="table-actions"><button className="quiet-button" type="button" onClick={() => setDialog({ kind: "question", question })} title={t.edit}><Pencil size={14} /></button><button className="quiet-button" type="button" onClick={() => void deleteItem("question.delete", question.id)} title={t.delete}><Trash2 size={14} /></button></div></td></tr>)}
        </tbody></table>{!visibleQuestions.length && <EmptyState title={t.noQuestions} description={t.questionsDescription} />}</section>
      </>
    );
  } else if (view === "topics" && canManageContent) {
    page = (
      <>
        <SectionHeading eyebrow={t.workspace} title={t.topicsTitle} description={t.topicsDescription} action={<button className="primary-button" type="button" onClick={() => setDialog({ kind: "topic", topic: null })}><Plus size={16} />{t.newTopic}</button>} />
        <section className="panel table-wrap"><table className="data-table"><thead><tr><th>{t.topicName}</th><th>{t.questionsTitle}</th><th>{t.actions}</th></tr></thead><tbody>
          {snapshot.topics.map((topic) => <tr key={topic.id}><td><div className="topic-cell"><div className="topic-thumb" style={topic.image ? { backgroundImage: `url(${topic.image})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined} /><strong>{topic.text}</strong></div></td><td>{snapshot.questions.filter((question) => question.topicId === topic.id).length}</td><td><div className="table-actions"><button className="quiet-button" type="button" onClick={() => setDialog({ kind: "topic", topic })} title={t.edit}><Pencil size={14} /></button></div></td></tr>)}
        </tbody></table>{!snapshot.topics.length && <EmptyState title={t.noTopics} description={t.topicsDescription} />}</section>
      </>
    );
  } else if (view === "players" && isAdmin) {
    page = (
      <>
        <SectionHeading eyebrow={t.workspace} title={t.playersTitle} description={t.playersDescription} />
        <div className="toolbar"><SearchBox value={filterText} onChange={setFilterText} placeholder={t.searchPlayers} /><select className="filter-select" value={filterRole} onChange={(event) => setFilterRole(event.target.value)}><option value="all">{t.allRoles}</option><option value="admin">{t.admin}</option><option value="editor">{t.editor}</option><option value="player">{t.player}</option></select></div>
        <section className="panel table-wrap"><table className="data-table"><thead><tr><th>{t.username}</th><th>{t.role}</th><th>{t.gamesPlayed}</th><th>{t.actions}</th></tr></thead><tbody>
          {visiblePlayers.map((player) => <tr key={player.id}><td><div className="topic-cell"><Avatar username={player.username} url={player.avatar} /><strong>{player.username}</strong></div></td><td>{t[player.role]}</td><td>{snapshot.games.filter((game) => game.players.some((entry) => entry.id === player.id) && game.status !== "draft").length}</td><td><div className="table-actions"><button className="quiet-button" type="button" onClick={() => setDialog({ kind: "player", player })} title={t.edit}><Pencil size={14} /></button><button className="quiet-button" type="button" disabled={player.id === user.id} onClick={() => void deleteItem("player.delete", player.id)} title={t.delete}><Trash2 size={14} /></button></div></td></tr>)}
        </tbody></table>{!visiblePlayers.length && <EmptyState title={t.noPlayers} description={t.playersDescription} />}</section>
      </>
    );
  } else if (view === "leaderboard") {
    page = <LeaderboardPage locale={locale} entries={snapshot.leaderboard} />;
  } else if (view === "options") {
    page = <OptionsPage locale={locale} user={user} onTheme={changeTheme} onLanguage={changeLanguage} onDefaultLanguage={changeDefaultLanguage} />;
  } else {
    page = <SectionHeading eyebrow={t.workspace} title={t.dashboard} description={t.dashboardDescription} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><span className="brand-mark"><BrainCircuit size={20} /></span><span>SynaptiQuiz</span></div>
        <div className="sidebar-label">{t.workspace}</div>
        <nav className="nav-list" aria-label={t.workspace}>{navigation.map((item) => {
          const Icon = navIcons[item.key];
          return <button className={`nav-item ${view === item.key ? "active" : ""}`} type="button" key={item.key} onClick={() => { setGameId(null); setView(item.key); }}><Icon size={17} />{item.label}{item.key === "games" && <span className="nav-count">{snapshot.games.length}</span>}</button>;
        })}</nav>
        <div className="sidebar-bottom"><div className="profile-chip"><Avatar username={user.username} url={user.avatar} /><span className="profile-meta"><strong>{user.username}</strong><span>{t[user.role]}</span></span><button className="icon-button" type="button" title={t.signOut} onClick={() => void onLogout()}><LogOut size={15} /></button></div></div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <span className="breadcrumb">{t.workspace} <span aria-hidden="true">/</span> {view === "game" ? t.games : t[view as keyof typeof t] ?? t.dashboard}</span>
          <div className="topbar-actions">
            <select className="language-select" aria-label={t.interfaceLanguage} value={locale} onChange={(event) => void changeLanguage(event.target.value as Locale)}><option value="en">EN</option><option value="it">IT</option></select>
            <button className="icon-button" type="button" aria-label={user.theme === "dark" ? t.light : t.dark} title={user.theme === "dark" ? t.light : t.dark} onClick={() => void changeTheme(user.theme === "dark" ? "light" : "dark")}>{user.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
          </div>
        </header>
        <main className="content">
          {!online && <div className="offline-banner"><span aria-hidden="true">●</span>{t.offline}</div>}
          {pendingCount > 0 && <div className="offline-banner">{pendingCount} {t.pendingSync}</div>}
          {page}
          {notice && <div className="toast" role="status">{notice}</div>}
        </main>
      </div>
      {dialog?.kind === "game" && <GameEditorDialog locale={locale} snapshot={snapshot} game={dialog.game} onClose={() => setDialog(null)} onSubmit={submitMutation} />}
      {dialog?.kind === "duplicate" && <DuplicateDialog locale={locale} snapshot={snapshot} game={dialog.game} onClose={() => setDialog(null)} onSubmit={submitMutation} />}
      {dialog?.kind === "question" && <QuestionEditorDialog locale={locale} question={dialog.question} topics={snapshot.topics} onClose={() => setDialog(null)} onSubmit={submitMutation} />}
      {dialog?.kind === "topic" && <TopicEditorDialog locale={locale} topic={dialog.topic} onClose={() => setDialog(null)} onSubmit={submitMutation} />}
      {dialog?.kind === "player" && <PlayerEditorDialog locale={locale} player={dialog.player} onClose={() => setDialog(null)} onSubmit={submitMutation} />}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, suffix }: { label: string; value: number; icon: LucideIcon; suffix?: string }) {
  return <div className="stat-card"><div className="stat-topline"><span>{label}</span><span className="stat-icon"><Icon size={16} /></span></div><div className="stat-value">{value.toLocaleString()} {suffix && <small>{suffix}</small>}</div></div>;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="search-wrap"><Search size={15} /><input className="search-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}

function LeaderboardPage({ locale, entries }: { locale: Locale; entries: LeaderboardEntry[] }) {
  const t = messages[locale];
  return <><SectionHeading eyebrow={t.games} title={t.leaderboardTitle} description={t.leaderboardDescription} />{entries.length ? <section className="panel table-wrap"><table className="data-table"><thead><tr><th>{t.rank}</th><th>{t.players}</th><th>{t.score}</th><th>{t.gameWins}</th><th>{t.gamesPlayed}</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td><strong>{String(entry.rank).padStart(2, "0")}</strong></td><td><div className="topic-cell"><Avatar username={entry.username} url={entry.avatar} /><strong>{entry.username}</strong></div></td><td>{entry.points} {t.pointsShort}</td><td>{entry.wins}</td><td>{entry.games}</td></tr>)}</tbody></table></section> : <section className="panel"><EmptyState title={t.noScores} description={t.leaderboardDescription} /></section>}</>;
}

function OptionsPage({
  locale,
  user,
  onTheme,
  onLanguage,
  onDefaultLanguage,
}: {
  locale: Locale;
  user: AppSnapshot["user"];
  onTheme: (theme: "light" | "dark") => void;
  onLanguage: (locale: Locale) => void;
  onDefaultLanguage: (locale: Locale) => void;
}) {
  const t = messages[locale];
  return <><SectionHeading eyebrow={t.workspace} title={t.optionsTitle} description={t.optionsDescription} /><section className="panel"><div className="panel-heading"><h2>{t.optionsTitle}</h2><span className="muted-copy">{t.savedAutomatically}</span></div><div className="panel-body">
    <SettingsGroup title={t.appearance} description={t.appearanceDescription}><div className="segmented-control"><button type="button" className={user.theme === "light" ? "active" : ""} onClick={() => onTheme("light")}><Sun size={14} />{t.light}</button><button type="button" className={user.theme === "dark" ? "active" : ""} onClick={() => onTheme("dark")}><Moon size={14} />{t.dark}</button></div></SettingsGroup>
    <SettingsGroup title={t.interfaceLanguage} description={t.interfaceLanguageDescription}><div className="segmented-control"><button type="button" className={locale === "en" ? "active" : ""} onClick={() => onLanguage("en")}>EN · {t.english}</button><button type="button" className={locale === "it" ? "active" : ""} onClick={() => onLanguage("it")}>IT · {t.italian}</button></div></SettingsGroup>
    <SettingsGroup title={t.defaultGameLanguage} description={t.defaultGameLanguageDescription}><div className="segmented-control"><button type="button" className={user.defaultLanguage === "en" ? "active" : ""} onClick={() => onDefaultLanguage("en")}>{t.english}</button><button type="button" className={user.defaultLanguage === "it" ? "active" : ""} onClick={() => onDefaultLanguage("it")}>{t.italian}</button></div></SettingsGroup>
  </div></section></>;
}

function SettingsGroup({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="settings-group"><div className="settings-copy"><strong>{title}</strong><span>{description}</span></div>{children}</div>;
}

function GamePlayView({
  game,
  locale,
  userId,
  online,
  pendingCount,
  onBack,
  onStart,
  onAnswer,
}: {
  game: GameRecord;
  locale: Locale;
  userId: string;
  online: boolean;
  pendingCount: number;
  onBack: () => void;
  onStart: () => Promise<unknown>;
  onAnswer: (game: GameRecord, questionId: string, playerId: string, optionId: string) => Promise<void>;
}) {
  const t = messages[locale];
  const [answering, setAnswering] = useState(false);
  const answeredCount = game.questions.filter((question) => question.answer).length;
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const availableQuestions = game.questions.filter((question) => !question.answer);
  const currentQuestion = availableQuestions.find((question) => question.id === selectedQuestionId) ?? availableQuestions[0];
  const currentPlayer = game.players.length ? game.players[answeredCount % game.players.length] : undefined;
  const canStart = game.creator.id === userId || game.players.some((player) => player.id === userId);
  const finishedLocally = answeredCount === game.questions.length;
  const scores = game.players.map((player) => ({
    player,
    points: game.questions.reduce((total, question) => total + (question.answer?.player.id === player.id ? question.answer.points ?? 0 : 0), 0),
  })).sort((left, right) => right.points - left.points);
  const tied = scores.length > 1 && scores[0].points === scores[1].points;

  return <div className="question-play">
    <button className="quiet-button" type="button" onClick={onBack}><ArrowLeft size={15} />{t.backToGames}</button>
    <SectionHeading eyebrow={game.name} title={game.status === "completed" ? t.gameComplete : game.name} description={`${game.players.length} ${t.playersLabel.toLowerCase()} · ${game.questions.length} ${t.questionsLabel.toLowerCase()} · ${game.language.toUpperCase()}`} />
    {game.status === "draft" ? (
      <section className="panel"><div className="panel-body"><div className="turn-banner"><Gamepad2 size={17} /><strong>{game.players.map((player) => player.username).join(" · ")}</strong><span>{game.questions.length} questions</span></div><p className="muted-copy">{t.gameFormNote}</p><button className="primary-button" type="button" disabled={!canStart || !online} onClick={() => void onStart()}><Play size={15} />{t.startGame}</button></div></section>
    ) : game.status === "completed" || finishedLocally ? (
      <>
        <div className="result-banner"><h2>{game.status === "completed" ? (tied ? t.tieGame : `${t.winner}: ${scores[0]?.player.username ?? ""}`) : t.syncing}</h2><p>{game.status === "completed" ? `${scores[0]?.points ?? 0} ${t.pointsShort}` : `${pendingCount} ${t.pendingSync}`}</p></div>
        <div className="game-scoreboard">{scores.map(({ player, points }) => <div className="score-chip" key={player.id}><Avatar username={player.username} url={player.avatar} />{player.username}<strong>{points} {t.pointsShort}</strong></div>)}</div>
        {game.status === "completed" && <div className="result-list">{game.questions.map((question, index) => <div className="result-question" key={question.id}><strong>{index + 1}. {question.text}</strong><span className="result-answer correct">{t.correct}: {question.options.find((option) => option.correct)?.text}</span>{question.answer && <span className="result-answer">{question.answer.player.username}: {question.answer.selectedText} · {question.answer.points ?? 0} {t.pointsShort}</span>}</div>)}</div>}
      </>
    ) : currentQuestion && currentPlayer ? (
      <>
        <div className="play-progress"><span style={{ width: `${(answeredCount / game.questions.length) * 100}%` }} /></div>
        <div className="play-topline"><span>{t.questionOf.replace("{current}", String(answeredCount + 1)).replace("{total}", String(game.questions.length))}</span><span>{t.chooseQuestion}</span></div>
        <div className="turn-banner"><Avatar username={currentPlayer.username} url={currentPlayer.avatar} /><strong>{currentPlayer.username}</strong><span>{currentPlayer.id === userId ? t.yourTurn : t.upNext}</span></div>
        <div className="question-pick-grid">{availableQuestions.map((question, index) => <button className={`question-pick ${currentQuestion?.id === question.id ? "active" : ""}`} type="button" key={question.id} onClick={() => setSelectedQuestionId(question.id)}><span>Q{String(index + 1).padStart(2, "0")}</span><strong>{question.topic}</strong><small>{question.difficulty}/5</small></button>)}</div>
        <section className="play-question"><span className="eyebrow">{t.question} · {currentQuestion.difficulty}/5</span><h2>{currentQuestion.text}</h2><div className="answer-options">{currentQuestion.options.map((option, index) => <button className="answer-option" key={option.id} type="button" disabled={answering || !canStart} onClick={async () => { setAnswering(true); try { await onAnswer(game, currentQuestion.id, currentPlayer.id, option.id); } finally { setAnswering(false); } }}><span className="answer-letter">{String.fromCharCode(65 + index)}</span>{option.text}</button>)}</div></section>
        <div className="game-scoreboard">{game.players.map((player) => <div className="score-chip" key={player.id}><Avatar username={player.username} url={player.avatar} />{player.username}<strong>{game.questions.filter((question) => question.answer?.player.id === player.id).length} / {game.questions.length / game.players.length}</strong></div>)}</div>
        {!online && <div className="offline-banner">{t.offline}</div>}
      </>
    ) : <EmptyState title={t.noGames} description={t.noGamesDescription} />}
  </div>;
}

function DialogFrame({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = messages.en;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><header className="modal-header"><div><h2>{title}</h2><p>{description}</p></div><button className="icon-button" type="button" title={t.close} onClick={onClose}><span aria-hidden="true">×</span></button></header>{children}</section></div>;
}

type DialogSubmit = (payload: Record<string, unknown>) => Promise<unknown>;

function GameEditorDialog({
  locale,
  snapshot,
  game,
  onClose,
  onSubmit,
}: {
  locale: Locale;
  snapshot: AppSnapshot;
  game: GameRecord | null;
  onClose: () => void;
  onSubmit: DialogSubmit;
}) {
  const t = messages[locale];
  const [name, setName] = useState(game?.name ?? "");
  const [language, setLanguage] = useState<Locale>(game?.language ?? snapshot.user.defaultLanguage);
  const [playerIds, setPlayerIds] = useState<string[]>(game?.players.map((player) => player.id) ?? [snapshot.user.id]);
  const [questionIds, setQuestionIds] = useState<string[]>(game?.questions.map((question) => question.questionId) ?? []);
  const [search, setSearch] = useState("");
  const [questionTopic, setQuestionTopic] = useState("all");
  const [questionDifficulty, setQuestionDifficulty] = useState("all");
  const [error, setError] = useState("");
  const effectivePlayers = [...new Set(playerIds)];
  const eligibleQuestions = snapshot.questions.filter((question) => {
    const variant = question.variants.find((item) => item.language === language);
    return variant &&
      `${variant.text} ${question.topic.text} ${question.difficulty}`.toLowerCase().includes(search.toLowerCase()) &&
      (questionTopic === "all" || question.topicId === questionTopic) &&
      (questionDifficulty === "all" || String(question.difficulty) === questionDifficulty);
  });
  const validCount = questionIds.length > 0 && effectivePlayers.length > 0 && questionIds.length % effectivePlayers.length === 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validCount) {
      setError(questionIds.length ? t.validationDivisible : t.questionCountRequired);
      return;
    }
    const result = await onSubmit({ action: game ? "game.update" : "game.create", id: game?.id, name, language, playerIds, questionIds });
    if (result) onClose();
  }

  return <DialogFrame title={game ? t.editGame : t.createGame} description={t.gameFormNote} onClose={onClose}>
    <form onSubmit={submit}>
      <div className="modal-content"><div className="form-grid">
        <label className="field span-two">{t.gameName}<input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="field span-two">{t.language}<select value={language} onChange={(event) => { const nextLanguage = event.target.value as Locale; setLanguage(nextLanguage); setQuestionIds((current) => current.filter((id) => snapshot.questions.find((item) => item.id === id)?.variants.some((variant) => variant.language === nextLanguage))); }}><option value="en">{t.english}</option><option value="it">{t.italian}</option></select></label>
        <div className="span-two"><p className="section-label">{t.selectPlayers}</p><div className="selection-list">{snapshot.users.map((player) => <label className="selection-item" key={player.id}><input type="checkbox" checked={playerIds.includes(player.id)} onChange={(event) => setPlayerIds((current) => event.target.checked ? [...current, player.id] : current.filter((id) => id !== player.id))} /><span>{player.username}</span><small>{t[player.role]}</small></label>)}</div></div>
        <div className="span-two"><p className="section-label">{t.selectQuestions}</p><input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.filterQuestions} /><div className="toolbar" style={{ marginTop: 8 }}><select className="filter-select" value={questionTopic} onChange={(event) => setQuestionTopic(event.target.value)}><option value="all">{t.allTopics}</option>{snapshot.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.text}</option>)}</select><select className="filter-select" value={questionDifficulty} onChange={(event) => setQuestionDifficulty(event.target.value)}><option value="all">{t.allDifficulties}</option>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level}/5</option>)}</select></div><div className="selection-list">{eligibleQuestions.map((question) => <label className="selection-item" key={question.id}><input type="checkbox" checked={questionIds.includes(question.id)} onChange={(event) => setQuestionIds((current) => event.target.checked ? [...current, question.id] : current.filter((id) => id !== question.id))} /><span>{question.variants.find((variant) => variant.language === language)?.text}</span><small>{question.topic.text} · {question.difficulty}/5</small></label>)}</div><p className={`validation-note ${validCount ? "" : "invalid"}`}>{validCount ? `${questionIds.length} ${t.questionCount} · ${effectivePlayers.length} ${t.playersLabel.toLowerCase()}` : t.validationDivisible}</p></div>
      </div>{error && <p className="error-message">{error}</p>}</div>
      <footer className="modal-footer"><button className="secondary-button" type="button" onClick={onClose}>{t.cancel}</button><button className="primary-button" type="submit" disabled={!validCount}>{game ? t.saveGame : t.createGame}</button></footer>
    </form>
  </DialogFrame>;
}

function DuplicateDialog({
  locale,
  snapshot,
  game,
  onClose,
  onSubmit,
}: {
  locale: Locale;
  snapshot: AppSnapshot;
  game: GameRecord;
  onClose: () => void;
  onSubmit: DialogSubmit;
}) {
  const t = messages[locale];
  const [name, setName] = useState(`${game.name} copy`);
  const [playerIds, setPlayerIds] = useState<string[]>(() => [...new Set([...game.players.map((player) => player.id), snapshot.user.id])]);
  const [questionIds, setQuestionIds] = useState<string[]>(game.questions.map((question) => question.questionId));
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const effectivePlayers = [...new Set([...playerIds, snapshot.user.id])];
  const questionBank = new Map<string, { questionId: string; text: string; topic: string; difficulty: number }>();
  for (const sourceGame of snapshot.games) {
    if (sourceGame.language !== game.language) continue;
    for (const question of sourceGame.questions) {
      if (!questionBank.has(question.questionId)) {
        questionBank.set(question.questionId, {
          questionId: question.questionId,
          text: question.text,
          topic: question.topic,
          difficulty: question.difficulty,
        });
      }
    }
  }
  const eligibleQuestions = [...questionBank.values()].filter((question) =>
    `${question.text} ${question.topic} ${question.difficulty}`.toLowerCase().includes(search.toLowerCase()),
  );
  const validCount = questionIds.length > 0 && questionIds.length % effectivePlayers.length === 0;
  return <DialogFrame title={t.duplicateGame} description={game.name} onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); if (!validCount) { setError(t.validationDivisible); return; } const result = await onSubmit({ action: "game.duplicate", id: game.id, name, language: game.language, playerIds, questionIds }); if (result) onClose(); }}><div className="modal-content"><div className="form-grid"><label className="field span-two">{t.duplicateName}<input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label><div className="span-two"><p className="section-label">{t.selectPlayers}</p><div className="selection-list">{snapshot.users.map((player) => <label className="selection-item" key={player.id}><input type="checkbox" checked={playerIds.includes(player.id) || player.id === snapshot.user.id} onChange={(event) => setPlayerIds((current) => event.target.checked ? [...current, player.id] : current.filter((id) => id !== player.id))} /><span>{player.username}</span><small>{t[player.role]}</small></label>)}</div></div><div className="span-two"><p className="section-label">{t.selectQuestions} · {game.language.toUpperCase()}</p><input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.filterQuestions} /><div className="selection-list" style={{ marginTop: 8 }}>{eligibleQuestions.map((question) => <label className="selection-item" key={question.questionId}><input type="checkbox" checked={questionIds.includes(question.questionId)} onChange={(event) => setQuestionIds((current) => event.target.checked ? [...current, question.questionId] : current.filter((id) => id !== question.questionId))} /><span>{question.text}</span><small>{question.topic} · {question.difficulty}/5</small></label>)}</div><p className={`validation-note ${validCount ? "" : "invalid"}`}>{validCount ? `${questionIds.length} ${t.questionCount} · ${effectivePlayers.length} ${t.playersLabel.toLowerCase()}` : t.validationDivisible}</p></div></div>{error && <p className="error-message">{error}</p>}</div><footer className="modal-footer"><button className="secondary-button" type="button" onClick={onClose}>{t.cancel}</button><button className="primary-button" type="submit" disabled={!validCount}><Copy size={14} />{t.duplicate}</button></footer></form></DialogFrame>;
}

type DraftAnswer = { text: string; correct: boolean; plausibility: number };
type DraftVariant = { text: string; answers: DraftAnswer[] };

function emptyVariant(): DraftVariant {
  return {
    text: "",
    answers: [
      { text: "", correct: true, plausibility: 90 },
      { text: "", correct: false, plausibility: 75 },
      { text: "", correct: false, plausibility: 60 },
      { text: "", correct: false, plausibility: 45 },
    ],
  };
}

function QuestionEditorDialog({
  locale,
  question,
  topics,
  onClose,
  onSubmit,
}: {
  locale: Locale;
  question: AppSnapshot["questions"][number] | null;
  topics: AppSnapshot["topics"];
  onClose: () => void;
  onSubmit: DialogSubmit;
}) {
  const t = messages[locale];
  const [topicId, setTopicId] = useState(question?.topicId ?? topics[0]?.id ?? "");
  const [difficulty, setDifficulty] = useState(question?.difficulty ?? 1);
  const [activeLanguage, setActiveLanguage] = useState<Locale>(locale);
  const [error, setError] = useState("");
  const [variants, setVariants] = useState<Record<Locale, DraftVariant>>(() => {
    const make = (language: Locale) => {
      const variant = question?.variants.find((item) => item.language === language);
      if (!variant) return emptyVariant();
      return {
        text: variant.text,
        answers: [...variant.answers].sort((a, b) => a.position - b.position).map((answer) => ({
          text: answer.text,
          correct: answer.correct ?? false,
          plausibility: answer.plausibility,
        })),
      };
    };
    return { en: make("en"), it: make("it") };
  });
  const currentVariant = variants[activeLanguage];

  function updateVariant(update: (current: DraftVariant) => DraftVariant) {
    setVariants((current) => ({ ...current, [activeLanguage]: update(current[activeLanguage]) }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const complete = (["en", "it"] as const).every((language) =>
      variants[language].text.trim() && variants[language].answers.every((answer) => answer.text.trim()) && variants[language].answers.filter((answer) => answer.correct).length === 1,
    );
    if (!topicId || !complete) {
      setError(t.oneCorrect);
      return;
    }
    const result = await onSubmit({
      action: question ? "question.update" : "question.create",
      id: question?.id,
      topicId,
      difficulty,
      variants: (["en", "it"] as const).map((language) => ({ language, text: variants[language].text, answers: variants[language].answers })),
    });
    if (result) onClose();
  }

  return <DialogFrame title={question ? t.editQuestion : t.newQuestion} description={t.oneCorrect} onClose={onClose}><form onSubmit={submit}><div className="modal-content">
    {!topics.length ? <EmptyState title={t.noTopics} description={t.noTopicsForQuestions} /> : <>
      <div className="form-grid"><label className="field">{t.topicsTitle}<select required value={topicId} onChange={(event) => setTopicId(event.target.value)}>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.text}</option>)}</select></label><label className="field">{t.difficulty}<select value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level} / 5</option>)}</select></label></div>
      <div className="language-tabs" role="tablist"><button type="button" className={activeLanguage === "en" ? "active" : ""} onClick={() => setActiveLanguage("en")}>{t.english}</button><button type="button" className={activeLanguage === "it" ? "active" : ""} onClick={() => setActiveLanguage("it")}>{t.italian}</button></div>
      <label className="field">{t.questionText}<textarea required minLength={5} maxLength={500} value={currentVariant.text} onChange={(event) => updateVariant((current) => ({ ...current, text: event.target.value }))} /></label>
      <p className="section-label" style={{ marginTop: 18 }}>{t.answerText} · {t.plausibility}</p>
      {currentVariant.answers.map((answer, index) => <div className="answer-editor" key={index}><input aria-label={t.correctAnswer} type="radio" name={`correct-${activeLanguage}`} checked={answer.correct} onChange={() => updateVariant((current) => ({ ...current, answers: current.answers.map((option, optionIndex) => ({ ...option, correct: optionIndex === index })) }))} /><input type="text" required maxLength={240} value={answer.text} placeholder={`${t.answerText} ${index + 1}`} onChange={(event) => updateVariant((current) => ({ ...current, answers: current.answers.map((option, optionIndex) => optionIndex === index ? { ...option, text: event.target.value } : option) }))} /><input aria-label={t.plausibility} type="number" min="0" max="100" value={answer.plausibility} onChange={(event) => updateVariant((current) => ({ ...current, answers: current.answers.map((option, optionIndex) => optionIndex === index ? { ...option, plausibility: Number(event.target.value) } : option) }))} /></div>)}
    </>}
    {error && <p className="error-message">{error}</p>}
  </div><footer className="modal-footer"><button className="secondary-button" type="button" onClick={onClose}>{t.cancel}</button><button className="primary-button" type="submit" disabled={!topics.length}>{t.saveQuestion}</button></footer></form></DialogFrame>;
}

function TopicEditorDialog({
  locale,
  topic,
  onClose,
  onSubmit,
}: {
  locale: Locale;
  topic: AppSnapshot["topics"][number] | null;
  onClose: () => void;
  onSubmit: DialogSubmit;
}) {
  const t = messages[locale];
  const [name, setName] = useState(topic?.text ?? "");
  const [image, setImage] = useState(topic?.image ?? "");
  const [error, setError] = useState("");
  return <DialogFrame title={topic ? t.topicsTitle : t.newTopic} description={t.topicsDescription} onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); const result = await onSubmit({ action: topic ? "topic.update" : "topic.create", id: topic?.id, text: name, image }); if (result) onClose(); else setError(t.networkError); }}><div className="modal-content form-stack"><label className="field">{t.topicName}<input required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="field">{t.imageUrl}<input type="url" value={image} onChange={(event) => setImage(event.target.value)} placeholder="https://example.com/image.jpg" /></label>{error && <p className="error-message">{error}</p>}</div><footer className="modal-footer"><button className="secondary-button" type="button" onClick={onClose}>{t.cancel}</button><button className="primary-button" type="submit">{t.saveTopic}</button></footer></form></DialogFrame>;
}

function PlayerEditorDialog({
  locale,
  player,
  onClose,
  onSubmit,
}: {
  locale: Locale;
  player: AppSnapshot["users"][number];
  onClose: () => void;
  onSubmit: DialogSubmit;
}) {
  const t = messages[locale];
  const [username, setUsername] = useState(player.username);
  const [avatar, setAvatar] = useState(player.avatar ?? "");
  const [role, setRole] = useState(player.role);
  const [error, setError] = useState("");
  return <DialogFrame title={t.playersTitle} description={player.username} onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); const result = await onSubmit({ action: "player.update", id: player.id, username, avatar, role }); if (result) onClose(); else setError(t.networkError); }}><div className="modal-content form-stack"><label className="field">{t.username}<input required minLength={3} maxLength={24} value={username} onChange={(event) => setUsername(event.target.value)} /></label><label className="field">{t.avatarUrl}<input type="url" value={avatar} onChange={(event) => setAvatar(event.target.value)} placeholder="https://example.com/avatar.jpg" /></label><label className="field">{t.roleAccess}<select value={role} onChange={(event) => setRole(event.target.value as typeof role)}><option value="admin">{t.admin}</option><option value="editor">{t.editor}</option><option value="player">{t.player}</option></select></label>{error && <p className="error-message">{error}</p>}</div><footer className="modal-footer"><button className="secondary-button" type="button" onClick={onClose}>{t.cancel}</button><button className="primary-button" type="submit">{t.savePlayer}</button></footer></form></DialogFrame>;
}
