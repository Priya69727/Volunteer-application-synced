import { useEffect, useState } from "react";
import { Empty, FilterBar, Icon, OpportunityCard, PageHeader, cardFor, type Page } from "../components/shared";
import { usePortal } from "../components/portal";
import { fmtDate } from "../api";

export function ProjectsPage({ go, events = false, searchQuery = "", onSearchQueryChange }: { go: (p: Page) => void; events?: boolean; searchQuery?: string; onSearchQueryChange?: (query: string) => void }) {
  const { opportunities, select } = usePortal();
  const [query, setQuery] = useState(searchQuery);
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [sortByDate, setSortByDate] = useState(false);
  useEffect(() => setQuery(searchQuery), [searchQuery]);
  const items = opportunities.filter((o) => o.kind === (events ? "event" : "project"));
  const categories = [...new Set(items.map((i) => i.type).filter(Boolean))];
  const locations = [...new Set(items.map((i) => i.location).filter(Boolean))];
  const visible = items.filter((o) =>
    `${o.title} ${o.type} ${o.location} ${o.summary}`.toLowerCase().includes(query.toLowerCase()) &&
    (!category || o.type === category) && (!location || o.location === location));
  if (sortByDate) visible.reverse();

  return (
    <div className="page">
      <PageHeader title={events ? "Upcoming Events" : "Projects"} description={events ? "Join events that bring people together for lasting change." : "Discover opportunities to contribute your skills and time."} />
      <FilterBar placeholder={events ? "Search events..." : "Search projects..."} query={query} onQueryChange={(value) => { setQuery(value); onSearchQueryChange?.(value); }} category={category} onCategoryChange={setCategory} categories={categories} location={location} onLocationChange={setLocation} locations={locations} />
      <div className="result-row"><span><strong>{visible.length}</strong> open {events ? "events" : "projects"}</span><button onClick={() => setSortByDate(!sortByDate)}>{sortByDate ? "Latest first" : "Soonest first"} <Icon name="chevron" size={14} /></button></div>
      <div className="opportunity-grid">
        {visible.length ? visible.map((o) => <OpportunityCard item={cardFor(o, (d) => fmtDate(d, { day: "numeric", month: "short" }))} key={`${o.kind}-${o.id}`} onView={() => { select({ kind: o.kind, id: o.id }); go("project-detail"); }} />) : <Empty title="No matching opportunities" body="Try clearing a filter or changing your search." />}
      </div>
    </div>
  );
}
