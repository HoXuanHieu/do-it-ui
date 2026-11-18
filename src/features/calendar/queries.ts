import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eventsApi, type EventDetailDto, type EventFilters, type EventInput, type EventStatus } from './api'

export const eventKeys = {
  all: ['events'] as const,
  range: (from: Date, to: Date, filters: EventFilters) => ['events', 'range', from.toISOString(), to.toISOString(), filters] as const,
  detail: (id: string) => ['events', 'detail', id] as const,
}

export function useEventsInRange(from: Date, to: Date, filters: EventFilters = {}) {
  return useQuery({
    queryKey: eventKeys.range(from, to, filters),
    queryFn: () => eventsApi.list(from, to, filters),
    placeholderData: keepPreviousData,
  })
}

export function useEventDetail(id: string | null) {
  return useQuery({
    queryKey: eventKeys.detail(id ?? ''),
    queryFn: () => eventsApi.get(id!),
    enabled: !!id,
    retry: false,
  })
}

/** Every write refreshes range lists and stores the returned detail. */
function useEventWrite<TArgs>(fn: (args: TArgs) => Promise<EventDetailDto>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (detail) => {
      qc.setQueryData(eventKeys.detail(detail.id), detail)
      void qc.invalidateQueries({ queryKey: ['events', 'range'] })
    },
  })
}

export const useCreateEvent = () =>
  useEventWrite((body: EventInput & { note?: string | null }) => eventsApi.create(body))

export const useUpdateEvent = () =>
  useEventWrite(({ id, body }: { id: string; body: EventInput & { status: EventStatus } }) => eventsApi.update(id, body))

export const useSetEventStatus = () =>
  useEventWrite(({ id, status }: { id: string; status: EventStatus }) => eventsApi.setStatus(id, status))

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => eventsApi.remove(id),
    onSuccess: (_, id) => {
      // Mark stale without refetching: the open dialog still observes it and would 404.
      void qc.invalidateQueries({ queryKey: eventKeys.detail(id), refetchType: 'none' })
      void qc.invalidateQueries({ queryKey: ['events', 'range'] })
    },
  })
}

/** Notes change only the detail view. */
export function useNoteMutations(eventId: string) {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
  return {
    add: useMutation({ mutationFn: (content: string) => eventsApi.addNote(eventId, content), onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({ noteId, content }: { noteId: string; content: string }) => eventsApi.updateNote(eventId, noteId, content),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (noteId: string) => eventsApi.removeNote(eventId, noteId), onSuccess: refresh }),
  }
}
