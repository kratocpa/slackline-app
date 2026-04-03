
# Slackline web application

## Description
This file serves as a basic input for an agent to build an implementation plan. your task is to carefully read the description and then to create a plan for the implementation of the project + ask for clarifications before you start.

Create plan for build web app with frontend, backend, and database. The web app will be used for managing and sharing information about rigged slacklines. It will include features such as user authentication, creating and editing slackline entries, viewing detailed information about each slackline, and tracking crossings. The application will be built using Python with FastAPI for the backend, PostgreSQL for the database, and React with TypeScript for the frontend. The app will also integrate OpenStreetMap for displaying the location of the slacklines. The project will be containerized using Docker and designed for easy deployment on platforms like Render.com.

Goal is to create a web application for slackline. It will be a application, where is the list of rigged slacklines with datail informations. In detail information will be anchor 1, anchor 2, parking spot, name history etc... Also in detail view will be openstreetmap with the location of the rigged slackline. There should be a possibility to log in using oauth. When user is logged in, he should be able to create new slackline. Also each user should be able to edit his own slackline. This list of slackline will be fully searchable, sortable, and filterable.

In slacline detail will be tab crossing. In this tab is a list of users, who have crossed the slackline. In this tab will be date, username, style of crossing, notes. Also there will be a possibility to add a new crossing. In this form will be date, style of crossing, notes, and possibility to upload the image. Also there will be a possibility to see the history of changes for each slackline. In this history will be the date of change, the user who made the change, what was changed. Also, there should be a possibility to see the statistics of crossings for each slackline. In these statistics should be the number of crossings, most popular style of crossing, most active user etc...

## Workflow
Main page is list of slacklines with columns Name, length, height, rating, date of creation. this table is fully searchable, filterable, and sortable. also there is a pagination. On top of the page os openstreet map with the location of the slackline. In this table are only slackline, which are visible map (on map is each slackline, each pin).

After click on slackline, there is a detail view with tabs Information - there will be fields (not table, just detail) - - name, description, state, region, sector, length, height, author, name_history, date_tense, date_insertion, time_approach , time_tensioning, rating, created_at, updated_at, published_at, created_by, updated_by. Second tab will be Crossing – there will be list of crossings with columns date, user, style, rating.

## Stack
### Beckend
- python project with fastapi.
- There is endpoint to fetch list of slacklines with pagination, sorting, filtering, and searching.
- There is endpoint to fetch detail information about slackline.
- There is endpoint to create new slackline.
- There is endpoint to edit slackline.
- There is endpoint to fetch list of crossings for slackline.
- There is endpoint to create new crossing for slackline.
- There is endpoint to fetch history of changes for slackline.
- There is endpoint to fetch statistics of crossings for slackline.
- There is endpoint for user authentication with oauth.
- There will be one off endpoint for load slackline data from csv files - data/slacklines_202211171655.csv, data/components_point_anchor_points_202211171655.csv, data/components_point_anchor_points_202211171655.csv

### Database
- postgres

### Frontend
- react with typescript.

## Data
### Slacklines
#### slackline table
this data loads from the file data/slacklines_202211171655.csv
- id
- name
- description
- state
- region
- sector
- length
- height
- author
- name_history
- date_tense
- date_insertion
- time_approach
- time_tensioning
- rating
- created_at
- updated_at
- published_at
- created_by_id
- updated_by_id

#### Component table
this data loads from the file data/slacklines_components_202211171655.csv 
- id
- point_id
- component_id
- component_type (first_anchor_point, second_anchor_point, parking_spot)

#### Point table
this data loads from the file data/components_point_anchor_points_202211171655.csv
- id
- description
- lat
- lon

### Users
models for users suggest by best practices.

## Tech stack
- python
- fastapi
- sqlalchemy
- react
- typescript
- loguru
- openstreetmap
- for building app create a docker-compose file when will be running frontend, backend, and database
- write this app to be easily deployable to https://render.com/

## Update 16.3.2026
- Tab diary -> statistic -> will be more elegant, the diagrams are soo colorfull, do it more simple and more elegant. Diagrams will be more granular.
- on slackline add page datefield to insert also Date Tense.
- Rename column Date Tense to First Rigged
- Rename column Time Tensioning to Rigging Time.
- add to slackline detail column Restriction (you may need to add this column to database) and add to slackline view, and add posibility to set when create new slackline.
- add to slackline detail column Type (you may need to add this column to database). Set to value highline to all items in db where height > 10. And midline, when height < 10. When add new slackline add new listbox to set type. Possible values are highline, midline, waterline, longline.
- remove from slackline detail field Date Insertion.
- On main page add new tab Slackliners. In this tab there will be list of all registered users. In this list will be name, count of crossed lines, count of crossed lines in last 30 days, longest crossed line, and higest crossed lines.
  - when click on user row, there will be detailed statistics for picked user, similar as in diary -> statistic.
