# Bugfix Requirements Document

## Introduction

The event creation form at `/organizer/events/create` has multiple usability and validation issues that prevent organizers from successfully creating events, particularly on mobile devices. The form displays "Invalid datetime" errors, uses a complex datetime-local input that is not mobile-friendly, includes an unnecessary "Door Time" field, lacks support for temporary venue creation, and does not follow India-specific date/time formats. These issues make the form difficult to use and result in validation failures.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an organizer uses the event creation form THEN the system displays "Invalid datetime" errors for Start Date & Time, End Date & Time, and Door Time fields

1.2 WHEN an organizer attempts to input date and time on a mobile device THEN the system uses datetime-local input which is not mobile-friendly and difficult to use

1.3 WHEN an organizer views the form THEN the system combines date and time into a single input field making it harder to input values separately

1.4 WHEN an organizer creates an event THEN the system requires a "Door Time" field which is unnecessary for most events

1.5 WHEN an organizer wants to create an event at a venue not registered on the platform THEN the system only allows selection from existing venues with no option to add temporary venue details

1.6 WHEN an organizer adds stages to an event THEN the system uses the same problematic datetime-local input format for stage start and end times

1.7 WHEN an organizer views date/time inputs THEN the system does not use India-specific date format (DD-MM-YYYY) or provide 24-hour time option

### Expected Behavior (Correct)

2.1 WHEN an organizer uses the event creation form THEN the system SHALL validate datetime inputs correctly without displaying "Invalid datetime" errors for properly formatted inputs

2.2 WHEN an organizer attempts to input date and time on a mobile device THEN the system SHALL provide separate, mobile-friendly inputs for date and time in HH:MM format

2.3 WHEN an organizer views the form THEN the system SHALL split date and time into two separate input fields for easier data entry

2.4 WHEN an organizer creates an event THEN the system SHALL NOT require a "Door Time" field and SHALL remove it from the form

2.5 WHEN an organizer wants to create an event at a venue not registered on the platform THEN the system SHALL provide an option to add temporary venue details including name, location, maps link, directions, landmark, and contact information

2.6 WHEN an organizer adds stages to an event THEN the system SHALL use the same split date/time input format with mobile-friendly controls

2.7 WHEN an organizer views date/time inputs THEN the system SHALL use India date format (DD-MM-YYYY) and provide a 24-hour time option

2.8 WHEN an organizer adds a temporary venue THEN the system SHALL store it in a separate temporary venues table to avoid conflicts if the venue officially signs up later

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an organizer submits a valid event form THEN the system SHALL CONTINUE TO create the event with all provided details stored correctly

3.2 WHEN an organizer selects an existing registered venue THEN the system SHALL CONTINUE TO link the event to that venue using the venueId

3.3 WHEN an organizer adds multiple stages to an event THEN the system SHALL CONTINUE TO store all stage information correctly

3.4 WHEN an organizer cancels event creation THEN the system SHALL CONTINUE TO navigate back to the events list without saving

3.5 WHEN an organizer submits the form THEN the system SHALL CONTINUE TO convert local datetime to ISO 8601 format for storage

3.6 WHEN an organizer creates an event THEN the system SHALL CONTINUE TO set the event status to "draft" by default

3.7 WHEN an organizer fills in optional fields like description, capacity, and currency THEN the system SHALL CONTINUE TO save these values correctly

3.8 WHEN an organizer uses the form with a pre-filled venue from the discovery page THEN the system SHALL CONTINUE TO populate the venue selection automatically
