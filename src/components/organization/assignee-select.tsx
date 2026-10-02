'use client'

import { useQuery } from '@tanstack/react-query'
import { CheckIcon, ChevronsUpDownIcon, UserIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'
import { AssigneeAvatar } from '../project/task/task-badges'

export const UNASSIGNED_VALUE = 'unassigned'

export function AssigneeSelect({
  value,
  onChange,
  id,
  disabled
}: {
  value: string | null
  onChange: (memberId: string | null) => void
  id?: string
  disabled?: boolean
}) {
  const trpc = useTRPC()
  const [open, setOpen] = useState(false)
  const members = useQuery(trpc.org.members.queryOptions({ limit: 100 }))

  const items = members.data?.items ?? []
  const selected = items.find(member => member.id === value)

  function choose(memberId: string | null) {
    onChange(memberId)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-start gap-2 px-3 font-normal"
        >
          {selected ? (
            <>
              <AssigneeAvatar
                name={selected.name!}
                image={selected.image.image!}
                className="size-5"
              />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <>
              <UserIcon
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden
              />
              {/* Not `text-muted-foreground` on the whole button: the chevron
                  and the icon are already quiet, and greying the word as well
                  makes an assigned-to-nobody task read as a disabled control. */}
              <span className="text-muted-foreground truncate">
                {/* A loaded name may still be arriving for a value we hold. */}
                {value && members.isPending ? 'Loading…' : 'Unassigned'}
              </span>
            </>
          )}
          <ChevronsUpDownIcon
            className="text-muted-foreground ml-auto size-4 shrink-0 opacity-60"
            aria-hidden
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        // Matches the trigger, so the list does not jump wider than the field
        // it belongs to. Radix exposes the trigger width as a CSS variable.
        className="w-(--radix-popover-trigger-width) min-w-56 p-0"
      >
        <Command
          // The server has already sent every member; filtering the loaded set
          // in the browser is instant and costs no round trip. A team large
          // enough to page through is a search endpoint, and a backlog item.
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Search members…" />
          <CommandList>
            {members.isPending ? (
              <div className="text-muted-foreground flex items-center gap-2 px-3 py-6 text-sm">
                <Spinner className="size-4" />
                Loading members…
              </div>
            ) : (
              <>
                <CommandEmpty>No member by that name.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="Unassigned" onSelect={() => choose(null)}>
                    <UserIcon
                      className="text-muted-foreground size-4"
                      aria-hidden
                    />
                    Unassigned
                    <CheckIcon
                      className={cn(
                        'ml-auto size-4',
                        value === null ? 'opacity-100' : 'opacity-0'
                      )}
                      aria-hidden
                    />
                  </CommandItem>

                  {items.map(member => (
                    <CommandItem
                      key={member.id}
                      // What `cmdk` matches against — the name and the email,
                      // because half a team searches for a colleague by the
                      // address they last mailed them at.
                      value={`${member.name} ${member.email}`}
                      onSelect={() => choose(member.id)}
                    >
                      <AssigneeAvatar
                        name={member.name!}
                        image={null}
                        className="size-5"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {member.name}
                        {member.isSelf ? (
                          <span className="text-muted-foreground ml-1 text-xs">
                            (you)
                          </span>
                        ) : null}
                      </span>
                      <CheckIcon
                        className={cn(
                          'size-4',
                          value === member.id ? 'opacity-100' : 'opacity-0'
                        )}
                        aria-hidden
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
