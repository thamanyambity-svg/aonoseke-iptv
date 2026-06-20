/**
 * Grille calendrier (FullCalendar) — vue principale de la régie.
 * Chaque diffusion est un bloc coloré, déplaçable / redimensionnable.
 *
 * FullCalendar v6 est compatible React 19 (pas de findDOMNode, contrairement à
 * react-big-calendar). Les styles v6 sont auto-injectés : pas d'import CSS ici.
 *
 * @component CampaignCalendar
 */
import type { JSX } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput, EventChangeArg } from '@fullcalendar/core';

export interface RegieEvent {
  id: string;
  campaignId: string;
  title: string;
  start: string;
  end: string;
  color: string;
}

interface CampaignCalendarProps {
  events: RegieEvent[];
  onReschedule?: (campaignId: string, start: Date, end: Date) => void;
}

export function CampaignCalendar({ events, onReschedule }: CampaignCalendarProps): JSX.Element {
  const fcEvents: EventInput[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: e.color,
    borderColor: e.color,
    extendedProps: { campaignId: e.campaignId },
  }));

  function handleChange(arg: EventChangeArg): void {
    const cid = arg.event.extendedProps.campaignId as string | undefined;
    if (!cid || !arg.event.start || !arg.event.end) return;
    onReschedule?.(cid, arg.event.start, arg.event.end);
  }

  return (
    <div className="rg-calendar">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth' }}
        buttonText={{ today: "auj.", week: 'semaine', month: 'mois' }}
        firstDay={1}
        allDaySlot={false}
        slotMinTime="06:00:00"
        slotMaxTime="24:00:00"
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        dayHeaderContent={(arg) => arg.date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
        nowIndicator
        height={560}
        expandRows
        editable={!!onReschedule}
        eventResizableFromStart
        events={fcEvents}
        eventChange={handleChange}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
      />
    </div>
  );
}
