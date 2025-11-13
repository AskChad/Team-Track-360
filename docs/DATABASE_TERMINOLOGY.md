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
  - Athletes (can compete in events)
  - Coaches
  - Staff
  - Parents/Guardians (receive updates but don't compete)
  - Family Members (siblings, grandparents, etc.)
  - Supporters/Fans
  - Booster Club Members
  - Alumni
- Fields: `user_id`, `role_id`, `jersey_number`, `position`, `status`
- Uses the **`member_roles`** table for role definitions

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

## Member Roles System

### Role Categories
- **Athlete** - Team athletes who can compete in events
- **Coach** - Head coaches, assistant coaches, volunteer coaches
- **Staff** - Team managers, trainers, equipment managers, photographers
- **Family** - Parents/guardians, family members (siblings, grandparents, etc.)
- **Supporter** - Team supporters, booster club, alumni

### Generic vs Sport-Specific Roles
- **Generic Roles** (`sport_id = NULL`)
  - Available for ALL sports
  - Examples: "Parent/Guardian", "Family Member", "Team Supporter", "Head Coach"
  - Show up in role dropdowns for any team regardless of sport

- **Sport-Specific Roles** (`sport_id = <sport_uuid>`)
  - Only available for that specific sport
  - Examples: "Wrestling Coach", "Football Offensive Coordinator"
  - Only show up for teams of that sport

### Key Role Properties
- **`can_compete`** - Whether this role can be added to event rosters (true for athletes, false for parents/supporters)
- **`can_receive_updates`** - Whether members get team notifications (true for most roles)

## Key Differences

| Team Members | Event Rosters |
|---|---|
| Permanent team association | Temporary event participation |
| All team members | Selected athletes for this event |
| `team_members` table | `event_rosters` + `wrestling_roster_members` |
| "Who's on the team?" | "Who's competing today?" |
| Includes parents, supporters | Only competing athletes |
