import { buildAgendaHighlights } from "@/event-platform-utils";

function formatAgendaGroupDate(value) {
  if (!value) {
    return "Aktiviteter uten tidspunkt";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(new Date(value));
}

function formatClockTime(value) {
  if (!value) {
    return "Ikke satt";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function buildAgendaGroups(event) {
  const agendaHighlights = buildAgendaHighlights(event);
  const groups = [];
  let currentGroup = null;

  agendaHighlights.tasks.forEach((task) => {
    const groupKey = task.displayStartAt ? String(task.displayStartAt).slice(0, 10) : "__missing_date";

    if (!currentGroup || currentGroup.key !== groupKey) {
      currentGroup = {
        key: groupKey,
        label: formatAgendaGroupDate(task.displayStartAt),
        tasks: []
      };
      groups.push(currentGroup);
    }

    currentGroup.tasks.push(task);
  });

  return {
    groups,
    total: agendaHighlights.total
  };
}

export function GuestAgendaPageView({ event }) {
  const agenda = buildAgendaGroups(event);

  return (
    <div className="stack guest-agenda-page">
      {agenda.total === 0 ? (
        <div className="notice">
          <strong>Ingen agenda er publisert enda</strong>
          <p>Arrangøren må merke oppgaver med `Vises på agenda` før de kommer frem her.</p>
        </div>
      ) : (
        <div className="planning-agenda-groups">
          {agenda.groups.map((group) => (
            <section className="planning-agenda-group stack" key={`guest-agenda-group-${group.key}`}>
              <div className="planning-agenda-group-header">
                <h4>{group.label}</h4>
                <span className="role-pill">{group.tasks.length}</span>
              </div>
              <ul className="compact-list planning-agenda-list">
                {group.tasks.map((task) => (
                  <li
                    className={`planning-agenda-item ${task.isScheduled ? "" : "is-unscheduled"}`}
                    key={`guest-agenda-${task.id}`}
                  >
                    <div className="planning-agenda-time">
                      <strong>{task.displayStartAt ? formatClockTime(task.displayStartAt) : "Ikke satt"}</strong>
                    </div>
                    <div className="planning-agenda-main">
                      <strong>{task.title}</strong>
                      {task.agendaComment ? (
                        <span className="muted planning-agenda-comment">{task.agendaComment}</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
