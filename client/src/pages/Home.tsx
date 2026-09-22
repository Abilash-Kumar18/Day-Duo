import { useMemo, useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clipboard, Copy, Link2, LogOut, Plus, RefreshCw, Sparkles, Trash2, Users, X } from "lucide-react";
import { CustomCalendar } from "@/components/CustomCalendar";

const pad = (value: number) => String(value).padStart(2, "0");
const toDayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatDate = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

function AppMark() {
  return <div className="app-mark" aria-label="DuoDay logo"><span></span><span></span></div>;
}

function PersonMark({
  label,
  done,
  tone,
  isMe,
  onClick,
}: {
  label: string;
  done: boolean;
  tone: "mine" | "partner";
  isMe: boolean;
  onClick?: () => void;
}) {
  if (isMe) {
    return (
      <button
        type="button"
        className={`person-mark ${tone} ${done ? "done" : ""}`}
        onClick={onClick}
        aria-label={`${done ? "Unmark" : "Mark"} ${label}`}
        title={`Your check (${label}): ${done ? "Completed" : "Not completed - click to mark"}`}
      >
        <span className="person-mark-letter">{label.slice(0, 1)}</span>
        {done && <Check size={12} strokeWidth={3} />}
      </button>
    );
  }

  return (
    <div
      className={`person-mark ${tone} ${done ? "done" : "partner-pending"}`}
      title={`${label}'s check: ${done ? "Completed" : "Not completed yet"}`}
    >
      <span className="person-mark-letter">{label.slice(0, 1)}</span>
      {done ? <Check size={12} strokeWidth={3} /> : <span className="pending-dot">•</span>}
    </div>
  );
}

function AuthLanding() {
  const [name, setName] = useState("Alex");
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      utils.auth.me.setData(undefined, data.user as any);
      utils.auth.me.invalidate();
      toast.success(`Welcome to DuoDay, ${data.user?.name || "friend"}!`);
    },
    onError: (error) => {
      toast.error(error.message || "Could not sign in");
    },
  });

  const handleSignIn = (customName?: string) => {
    const finalName = (customName ?? name).trim() || "Alex";
    const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
    if (oauthPortalUrl) {
      startLogin();
      return;
    }
    login.mutate({ name: finalName });
  };

  return (
    <main className="landing-shell">
      <div className="landing-card">
        <div className="flex items-center gap-3"><AppMark /><span className="brand-word">DuoDay</span></div>
        <div className="landing-copy">
          <p className="eyebrow">A little momentum, together</p>
          <h1>Make today easier to finish.</h1>
          <p className="landing-subtitle">A shared daily list for two people who want to show up, check in, and keep going.</p>
          <div className="mt-7 flex flex-col gap-3 max-w-sm">
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSignIn(); }}
                placeholder="Your name (e.g. Alex)"
                className="setup-input"
                disabled={login.isPending}
              />
              <Button
                className="primary-button flex-shrink-0"
                onClick={() => handleSignIn()}
                disabled={login.isPending}
              >
                {login.isPending ? <RefreshCw className="spin" size={17} /> : <>Sign in to start <ArrowRight size={17} /></>}
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#829087]">
              <span>Quick demo login:</span>
              <button
                type="button"
                className="underline hover:text-[#45634e] cursor-pointer font-medium"
                onClick={() => handleSignIn("Alex")}
                disabled={login.isPending}
              >
                Alex (Partner 1)
              </button>
              <span>·</span>
              <button
                type="button"
                className="underline hover:text-[#45634e] cursor-pointer font-medium"
                onClick={() => handleSignIn("Jordan")}
                disabled={login.isPending}
              >
                Jordan (Partner 2)
              </button>
            </div>
          </div>
        </div>
        <div className="landing-note"><Sparkles size={16} /> Your progress is private to your duo.</div>
      </div>
      <div className="landing-orbit orbit-one"></div><div className="landing-orbit orbit-two"></div>
    </main>
  );
}

function DuoSetup({ onReady }: { onReady: () => void }) {
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");
  const create = trpc.duo.create.useMutation({ onSuccess: () => { toast.success("Your duo is ready"); onReady(); }, onError: (error) => toast.error(error.message) });
  const join = trpc.duo.join.useMutation({ onSuccess: () => { toast.success("You joined the duo"); onReady(); }, onError: (error) => toast.error(error.message) });
  const submit = () => mode === "create" ? create.mutate({ nickname: nickname || undefined }) : join.mutate({ inviteCode: code, nickname: nickname || undefined });
  return <main className="setup-shell"><div className="setup-card">
    <div className="setup-heading"><AppMark /><p className="eyebrow">Welcome to DuoDay</p><h1>Who are you doing today with?</h1><p>Start a shared space, then send the code to one person. You’ll both see the same list.</p></div>
    <div className="segmented"><button className={mode === "create" ? "active" : ""} onClick={() => setMode("create")}>Create a duo</button><button className={mode === "join" ? "active" : ""} onClick={() => setMode("join")}>Join with a code</button></div>
    {mode === "join" && <label className="field-label">Invite code<Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="e.g. 7JQK2M8A" maxLength={12} className="setup-input code-input" /></label>}
    <label className="field-label">Your name in this duo<Input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="e.g. Alex" className="setup-input" /></label>
    <Button className="primary-button w-full mt-3" disabled={(mode === "join" && code.length < 4) || create.isPending || join.isPending} onClick={submit}>{mode === "create" ? "Create shared space" : "Join shared space"}<ArrowRight size={17} /></Button>
  </div></main>;
}

function Consistency({ members, completions, dayKey }: { members: Array<{ id: number; name: string | null; nickname: string | null }>; completions: Array<{ taskId: number; userId: number; dayKey: string; isDone: number }>; dayKey: string }) {
  const days = useMemo(() => Array.from({ length: 35 }, (_, index) => { const d = new Date(`${dayKey}T12:00:00`); d.setDate(d.getDate() - (34 - index)); return toDayKey(d); }), [dayKey]);
  const doneLookup = useMemo(() => new Set(completions.filter(item => item.isDone).map(item => `${item.userId}-${item.dayKey}`)), [completions]);
  const labelFor = (member: typeof members[number]) => member.nickname || member.name?.split(" ")[0] || "Partner";
  const profileMembers = members.length === 1 ? [...members, { id: -1, name: null, nickname: "Partner" }] : members;
  const weeks = Array.from({ length: 5 }, (_, index) => days.slice(index * 7, index * 7 + 7));
  return <section className="consistency-card card-surface"><div className="section-heading"><div><p className="eyebrow">Both profiles</p><h2>Daily consistency</h2></div><span className="streak-badge"><Sparkles size={14} /> 5 weeks</span></div><p className="muted-copy">See both contribution calendars side by side, just like GitHub.</p><div className="github-calendar">{profileMembers.map((member, memberIndex) => { const pending = member.id === -1; return <div className={`profile-calendar ${pending ? "profile-calendar-pending" : ""}`} key={member.id}><div className="profile-calendar-head"><span className={`profile-avatar ${memberIndex === 0 ? "profile-avatar-a" : "profile-avatar-b"}`}>{pending ? "?" : labelFor(member).slice(0, 1)}</span><div><strong>{pending ? "Waiting for partner" : labelFor(member)}</strong><small>{pending ? "Their calendar appears when they join" : `${days.filter(day => doneLookup.has(`${member.id}-${day}`)).length} active days`}</small></div></div><div className="calendar-body"><div className="calendar-weekdays"><span></span><span>M</span><span></span><span>W</span><span></span><span>F</span><span></span></div><div className="calendar-columns">{weeks.map((week, weekIndex) => <div className="calendar-week" key={weekIndex}>{week.map(day => <span key={day} title={`${pending ? "Partner" : labelFor(member)} · ${day}`} className={`tracker-cell ${!pending && doneLookup.has(`${member.id}-${day}`) ? "done" : ""} ${day === dayKey ? "today" : ""}`}></span>)}</div>)}</div><div className="calendar-months"><span>{new Date(`${days[0]}T12:00:00`).toLocaleDateString(undefined, { month: "short" })}</span><span>{new Date(`${days[days.length - 1]}T12:00:00`).toLocaleDateString(undefined, { month: "short" })}</span></div></div></div>; })}</div><div className="tracker-legend"><span>Less</span><i className="tracker-cell"></i><i className="tracker-cell done faint"></i><i className="tracker-cell done"></i><span>More</span></div></section>;
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [day, setDay] = useState(() => new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [filter, setFilter] = useState<"all" | "both" | "pending_partner" | "pending_me">("all");
  const calendarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    }
    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCalendar]);

  const dayKey = toDayKey(day);
  const duoQuery = trpc.duo.mine.useQuery(undefined, { enabled: Boolean(isAuthenticated) });
  const dashboard = trpc.todo.dashboard.useQuery({ dayKey }, { enabled: Boolean(isAuthenticated && duoQuery.data), refetchInterval: 5000 });
  const utils = trpc.useUtils();
  const addTask = trpc.todo.add.useMutation({ onSuccess: () => { utils.todo.dashboard.invalidate(); toast.success("Task added"); }, onError: (error) => toast.error(error.message) });
  const toggleTask = trpc.todo.toggle.useMutation({
    onMutate: async ({ taskId, isDone }) => {
      await utils.todo.dashboard.cancel({ dayKey });
      const previous = utils.todo.dashboard.getData({ dayKey });
      utils.todo.dashboard.setData({ dayKey }, old => old ? ({
        ...old,
        completions: [
          ...old.completions.filter(item => !(item.taskId === taskId && item.userId === user?.id && item.dayKey === dayKey)),
          { id: -Date.now(), taskId, userId: user?.id || 0, dayKey, isDone: isDone ? 1 : 0, updatedAt: new Date() }
        ]
      }) : old);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) utils.todo.dashboard.setData({ dayKey }, context.previous);
      toast.error("Could not save that update");
    },
    onSettled: () => utils.todo.dashboard.invalidate({ dayKey })
  });

  const removeTask = trpc.todo.remove.useMutation({
    onMutate: async ({ taskId }) => {
      await utils.todo.dashboard.cancel({ dayKey });
      const previous = utils.todo.dashboard.getData({ dayKey });
      utils.todo.dashboard.setData({ dayKey }, old => old ? ({
        ...old,
        tasks: old.tasks.filter(t => t.id !== taskId),
        completions: old.completions.filter(c => c.taskId !== taskId),
      }) : old);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) utils.todo.dashboard.setData({ dayKey }, context.previous);
      toast.error("Could not remove task");
    },
    onSuccess: () => {
      toast.success("Task removed");
    },
    onSettled: () => {
      utils.todo.dashboard.invalidate({ dayKey });
    },
  });

  const [newTask, setNewTask] = useState("");

  if (loading) return <div className="loading-screen"><RefreshCw className="spin" size={22} /> Loading your space…</div>;
  if (!isAuthenticated || !user) return <AuthLanding />;
  if (duoQuery.isLoading) return <div className="loading-screen"><RefreshCw className="spin" size={22} /> Finding your duo…</div>;
  if (!duoQuery.data) return <DuoSetup onReady={() => { duoQuery.refetch(); }} />;

  const data = dashboard.data;
  const members = data?.members || duoQuery.data.members;
  const me = members.find(member => member.id === user.id);
  const partner = members.find(member => member.id !== user.id);
  const labelFor = (member: typeof members[number] | undefined) => member?.nickname || member?.name?.split(" ")[0] || "Partner";
  const completions = data?.completions || [];

  const isDone = (taskId: number, memberId: number) => completions.some(item => item.taskId === taskId && item.userId === memberId && item.dayKey === dayKey && item.isDone === 1);

  const allTasks = data?.tasks || [];

  // Shared task metrics
  const myDoneCount = allTasks.filter(task => isDone(task.id, user.id)).length;
  const partnerDoneCount = partner ? allTasks.filter(task => isDone(task.id, partner.id)).length : 0;
  
  // A task is fully completed when BOTH have marked it (or 1 if partner hasn't joined)
  const isBothDone = (taskId: number) => {
    const myCheck = isDone(taskId, user.id);
    if (!partner) return myCheck;
    const partnerCheck = isDone(taskId, partner.id);
    return myCheck && partnerCheck;
  };

  const bothDoneCount = allTasks.filter(task => isBothDone(task.id)).length;
  const percent = allTasks.length ? Math.round((bothDoneCount / allTasks.length) * 100) : 0;

  // Filter tasks based on transparency tabs
  const filteredTasks = allTasks.filter(task => {
    const myCheck = isDone(task.id, user.id);
    const partnerCheck = partner ? isDone(task.id, partner.id) : false;
    if (filter === "both") return isBothDone(task.id);
    if (filter === "pending_partner") return partner ? (myCheck && !partnerCheck) : false;
    if (filter === "pending_me") return !myCheck;
    return true;
  });

  const shiftDay = (amount: number) => { const next = new Date(day); next.setDate(next.getDate() + amount); setDay(next); };
  const submitTask = () => { if (!newTask.trim()) return; addTask.mutate({ title: newTask.trim() }); setNewTask(""); };
  const copyCode = async () => { await navigator.clipboard?.writeText(duoQuery.data?.inviteCode || ""); toast.success("Invite code copied"); };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-lockup"><AppMark /><span className="brand-word">DuoDay</span></div>
      <div className="topbar-right">
        <div className="online-dot"><span></span> synced</div>
        <button className="icon-button" onClick={() => logout()} title="Sign out"><LogOut size={17} /></button>
      </div>
    </header>

    <main className="dashboard">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">Good to see you, {labelFor(me)}</p>
          <h1>Today, together.</h1>
        </div>
        <button className="invite-pill" onClick={copyCode}>
          <Link2 size={15} /> <span>Invite {partner ? labelFor(partner) : "Partner"}</span><Copy size={14} />
        </button>
      </div>

      <div className="date-nav-wrapper" ref={calendarRef}>
        <div className="date-nav">
          <button className="icon-button soft" onClick={() => shiftDay(-1)} title="Previous Day"><ArrowLeft size={17} /></button>
          <div className="date-display-trigger" onClick={() => setShowCalendar(!showCalendar)} title="Click to open calendar">
            <strong>{formatDate(dayKey)}</strong>
            {dayKey === toDayKey(new Date()) && <span className="today-label">Today</span>}
          </div>
          <button className="icon-button soft" onClick={() => shiftDay(1)} title="Next Day"><ArrowRight size={17} /></button>
          <button
            className={`icon-button soft calendar-trigger-btn ${showCalendar ? "active" : ""}`}
            onClick={() => setShowCalendar(!showCalendar)}
            title="Open Calendar Picker"
            aria-label="Open Calendar Picker"
          >
            <CalendarDays size={18} />
          </button>
        </div>

        {showCalendar && (
          <div className="calendar-popover-container">
            <CustomCalendar
              selectedDate={day}
              onSelectDate={(newDate) => {
                setDay(newDate);
                setShowCalendar(false);
              }}
              onClose={() => setShowCalendar(false)}
            />
          </div>
        )}
      </div>

      <div className="dashboard-grid">
        <section className="tasks-card card-surface">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Shared Tasks</p>
              <h2>Both must mark to complete</h2>
            </div>
            <span className="progress-number">{percent}%</span>
          </div>

          <div className="progress-track">
            <span style={{ width: `${percent}%` }}></span>
          </div>

          <p className="muted-copy tasks-summary">
            <strong>{bothDoneCount} of {allTasks.length}</strong> tasks completed by both of you · {partner ? `Transparency active with ${labelFor(partner)}` : "Invite partner to start sharing"}
          </p>

          {/* Filter / Transparency Tabs */}
          <div className="task-filters">
            <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
              All ({allTasks.length})
            </button>
            <button className={`filter-btn ${filter === "both" ? "active" : ""}`} onClick={() => setFilter("both")}>
              Both Completed ({bothDoneCount})
            </button>
            {partner && (
              <>
                <button className={`filter-btn ${filter === "pending_partner" ? "active" : ""}`} onClick={() => setFilter("pending_partner")}>
                  Awaiting {labelFor(partner)} ({allTasks.filter(t => isDone(t.id, user.id) && !isDone(t.id, partner.id)).length})
                </button>
                <button className={`filter-btn ${filter === "pending_me" ? "active" : ""}`} onClick={() => setFilter("pending_me")}>
                  Awaiting You ({allTasks.filter(t => !isDone(t.id, user.id)).length})
                </button>
              </>
            )}
          </div>

          {/* Task List */}
          <div className="task-list">
            {filteredTasks.length === 0 ? (
              <div className="empty-tasks-notice">
                <p>No tasks match this filter for {formatDate(dayKey)}.</p>
              </div>
            ) : (
              filteredTasks.map((task, index) => {
                const myCheck = isDone(task.id, user.id);
                const partnerCheck = partner ? isDone(task.id, partner.id) : false;
                const fullyDone = isBothDone(task.id);
                const partiallyDone = (myCheck || partnerCheck) && !fullyDone;

                return (
                  <div
                    className={`task-row ${fullyDone ? "completed" : ""} ${partiallyDone ? "partially-completed" : ""}`}
                    key={task.id}
                  >
                    <div className="task-content">
                      <span className="task-index">0{index + 1}</span>
                      <div className="task-title-group">
                        <span className="task-title">{task.title}</span>
                        {fullyDone ? (
                          <span className="status-badge status-both"><Check size={11} /> Both completed</span>
                        ) : myCheck && partner ? (
                          <span className="status-badge status-waiting">Waiting for {labelFor(partner)}</span>
                        ) : partnerCheck ? (
                          <span className="status-badge status-needs-you">{labelFor(partner)} completed · Needs you</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="task-actions">
                      <div className="people-checks" title="Click your mark to toggle your completion">
                        <PersonMark
                          label={labelFor(me)}
                          tone="mine"
                          done={myCheck}
                          isMe={true}
                          onClick={() => toggleTask.mutate({ taskId: task.id, dayKey, isDone: !myCheck })}
                        />
                        {partner ? (
                          <PersonMark
                            label={labelFor(partner)}
                            tone="partner"
                            done={partnerCheck}
                            isMe={false}
                          />
                        ) : (
                          <span className="person-mark waiting" title="Waiting for partner to join">?</span>
                        )}
                      </div>

                      <button
                        className="task-remove-btn"
                        onClick={() => removeTask.mutate({ taskId: task.id })}
                        disabled={removeTask.isPending}
                        title="Delete task"
                        aria-label={`Delete task ${task.title}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Task Input */}
          <div className="add-task">
            <Input
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") submitTask(); }}
              placeholder="Add a new shared task for both of you..."
            />
            <Button
              className="add-button"
              onClick={submitTask}
              disabled={!newTask.trim() || addTask.isPending}
              title="Add task"
            >
              <Plus size={18} />
            </Button>
          </div>
        </section>

        {/* Transparency & Duo Side Stack */}
        <div className="side-stack">
          <div className="people-card card-surface">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Shared Transparency</p>
                <h2>Duo Status</h2>
              </div>
              <Users size={19} className="heading-icon" />
            </div>

            <div className="person-line">
              <span className="avatar avatar-a">{labelFor(me).slice(0, 1)}</span>
              <div>
                <strong>{labelFor(me)} (You)</strong>
                <small>{myDoneCount} of {allTasks.length} tasks marked</small>
              </div>
              <span className="person-status">{myDoneCount}/{allTasks.length}</span>
            </div>

            <div className="person-line">
              <span className="avatar avatar-b">{partner ? labelFor(partner).slice(0, 1) : "?"}</span>
              <div>
                <strong>{partner ? labelFor(partner) : "Waiting for partner"}</strong>
                <small>{partner ? `${partnerDoneCount} of ${allTasks.length} tasks marked` : "Share the code below"}</small>
              </div>
              <span className="person-status">{partner ? `${partnerDoneCount}/${allTasks.length}` : "—"}</span>
            </div>

            <div className="transparency-callout">
              <Sparkles size={14} />
              <span>A task turns green when <strong>both of you</strong> mark it completed!</span>
            </div>

            <button className="copy-code" onClick={copyCode}>
              <Clipboard size={15} /> Copy invite code <strong>{duoQuery.data.inviteCode}</strong>
            </button>
          </div>

          <Consistency members={members} completions={completions} dayKey={dayKey} />
        </div>
      </div>

      <footer className="app-footer">
        <span><Sparkles size={14} /> DuoDay refreshes automatically to keep partner status synced live.</span>
        <button onClick={() => dashboard.refetch()}><RefreshCw size={14} /> Refresh</button>
      </footer>
    </main>
  </div>;
}>
  </div>;
}
