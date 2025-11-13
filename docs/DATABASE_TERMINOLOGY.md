# Database Terminology & Structure

## Multi-Sport System

The Team Track 360 system is designed to support **multiple sports** with sport-specific features:

### Sports Table
- **`sports`** - Master table of all sports (wrestling, football, basketball, etc.)
- Each sport has its own:
  - Event types
  - Weight classes (if applicable)
  - Roster structures
  - Statistics tracking

### Event Types Are Sport-Specific
- **`event_types`** table now has `sport_id` column
- Event types are tied to specific sports:
  - Wrestling: "Dual Meet", "Tournament", "Invitational"
  - Football: "Game", "Scrimmage"
  - Basketball: "Game", "Tournament"
- `sport_id` can be NULL for generic event types that apply to all sports (e.g., "Practice", "Team Meeting")

## Team Members vs Event Rosters

### Team Members (Permanent)
- **`team_members`** table - Who is on the TEAM
- This is the **permanent roster** of people associated with a team
- Includes:
  - Athletes
  - Coaches
  - Staff
  - Parents/Volunteers
- Fields: `user_id`, `role`, `jersey_number`, `position`, `status`

### Event Rosters (Temporary Lineups)
- **`event_rosters`** + **`wrestling_roster_members`** - Who is competing in a specific EVENT
- This is the **lineup for one event** - who is actually participating
- Represents the athletes selected to compete in this specific event
- Not everyone on the team participates in every event
- Fields include: `weight_class`, `seed`, `made_weight`, `status`

## Example Flow

1. **Create a Team** → Add members to `team_members` (permanent association)
2. **Create an Event** → Select event type (sport-specific)
3. **Build Event Roster** → Select which team members will compete in THIS event
4. **Track Results** → Record outcomes for those roster members

## Key Differences

| Team Members | Event Rosters |
|---|---|
| Permanent team association | Temporary event participation |
| All team members | Selected athletes for this event |
| `team_members` table | `event_rosters` + `wrestling_roster_members` |
| "Who's on the team?" | "Who's competing today?" |
