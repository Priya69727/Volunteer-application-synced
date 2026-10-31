import { useState } from "react";
import { Button, FilterBar, Icon, PageHeader, SectionTitle } from "../components/shared";
import { suggestedPeople, useDemoStore } from "../components/demoStore";

export function NetworkingPage() {
  const { data, setData } = useDemoStore();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [skill, setSkill] = useState("");
  const [showConnections, setShowConnections] = useState(false);
  const [selected, setSelected] = useState<(typeof suggestedPeople)[number] | null>(null);
  const locations = [...new Set(suggestedPeople.map((person) => person.place))];
  const skills = [...new Set(suggestedPeople.flatMap((person) => person.skills))];
  const visible = suggestedPeople.filter((person) =>
    (!showConnections || data.connections.includes(person.name)) &&
    `${person.name} ${person.place} ${person.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase()) &&
    (!location || person.place === location) &&
    (!skill || person.skills.includes(skill)),
  );

  return (
    <div className="page">
      <PageHeader title="Networking" description="Discover volunteers, share experience, and grow your impact together." action={<Button variant="secondary" onClick={() => setShowConnections(!showConnections)}>{showConnections ? "Suggested volunteers" : `My connections (${data.connections.length})`}</Button>} />
      <FilterBar placeholder="Search volunteers..." query={query} onQueryChange={setQuery} location={location} onLocationChange={setLocation} locations={locations} skill={skill} onSkillChange={setSkill} skills={skills} />
      {selected && <section className="panel profile-section"><button className="back-link" onClick={() => setSelected(null)}><Icon name="arrow" size={16} />Back to volunteers</button><h2>{selected.name}</h2><p>{selected.place} · {selected.skills.join(" · ")}</p><Button disabled={data.connections.includes(selected.name)} onClick={() => setData((current) => ({ ...current, connections: [...current.connections, selected.name] }))}>{data.connections.includes(selected.name) ? "Connected" : "Connect"}</Button></section>}
      <SectionTitle title={showConnections ? "My connections" : "Suggested volunteers"} />
      <div className="people-grid">{visible.map((person, index) => <article className="panel person-card" key={person.name}><div className={`person-avatar tone-${index % 4}`}>{person.initials}</div><h3>{person.name}</h3><p><Icon name="map" size={15} />{person.place}</p><div className="skill-row">{person.skills.map((item) => <span key={item}>{item}</span>)}</div><small>{index + 3} mutual connections</small><div><Button variant="secondary" onClick={() => setSelected(person)}>View profile</Button><Button disabled={data.connections.includes(person.name)} onClick={() => setData((current) => ({ ...current, connections: [...current.connections, person.name] }))}>{data.connections.includes(person.name) ? "Connected" : "Connect"}</Button></div></article>)}</div>
      {visible.length === 0 && <p className="empty">{showConnections ? "No connections match these filters." : "No volunteers match these filters."}</p>}
    </div>
  );
}
