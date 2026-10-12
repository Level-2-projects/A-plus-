# Requirements: A+ College Platform
 
Project board: <paste the link to your GitHub project here>
 
## 1. Roles
 
- Super Admin (Dean): full access to all departments; creates departments; uses the dean chatbot
- Department Admin (Head of department): manages his own department only (courses, student enrollment)
- Doctor: manages only the courses assigned to him (materials, attendance, grading)
- Student: accesses only the courses he is enrolled in
 
## 2. User stories
 
- US-01 As a department admin, I want to add courses and enroll students
  so that only registered students access each course. [Must]
- US-02 As a doctor, I want to upload lectures, quizzes and assignments
  so that students can study and submit. [Must]
- US-03 As a user (student, doctor, department admin or super admin), I want to log in with my account
  so that I see only the pages and data my role allows. [Must]
- US-04 As a doctor, I want to record attendance and absence
  so that each student's attendance is tracked. [Must]
- US-05 As a student, I want instant AI feedback after submitting
  so that I know what I got right or wrong. [Must]
- US-06 As a student, I want a dashboard with my attendance, grades and pending tasks
  so that I see my status in one place. [Must]
- US-07 As a super admin (dean), I want to ask a chatbot about attendance and performance across the whole college
  so that I can follow every department without opening many pages. [Must]
- US-08 As a student, I want an absence warning via n8n
  so that I know the next absence means being barred. [Should]
- US-09 As a student, I want a reminder one day before a deadline
  so that I don't miss it. [Should]
- US-10 As a doctor, I want to see the AI's score out of 10
  so that I grade faster (the final grade is mine). [Should]
- US-11 As a super admin, I want to create departments and assign department admins
  so that each department manages itself. [Should]
- US-12 As a student, I want to see a Market section in each course (why it matters, recommended courses, projects)
  so that I'm ready for the job market. [Should]
- US-13 As a doctor, I want to publish market content for my course, by agreement with the department head,
  so that students see accurate, relevant guidance. [Should]
- US-14 As a student, I want to see the monthly top 3 of my department
  so that I'm motivated to commit. [Could]
- US-15 As a student, I want a weekly summary
  so that I know what I did and what's still required. [Could]
- US-16 As a student, I want the Market section to show real opportunities from the outside market (jobs, internships)
  so that I know where my skills lead. [Could]
 
## 3. Acceptance criteria
 
Top 5 stories. The full scenarios are in the GitHub Issues.
 
### US-03 Log in by role
 
```gherkin
Feature: Log in by role
Scenario: Student logs in with valid data
Given the admin created an account for the student "Ali Hassan"
When the student enters his correct e-mail and password
Then the student is logged in
And the student sees only the courses he is enrolled in
 
Scenario: Wrong password
Given the account of "Ali Hassan" exists
When the student enters a wrong password
Then the request is rejected with "Wrong e-mail or password"
 
Scenario: Visitor is not logged in
Given a visitor is not logged in
When the visitor opens any page of the platform
Then the visitor is asked to log in
 
Scenario: Doctor tries to open an admin page
Given the doctor is logged in
When the doctor tries to open the "Create department" page
Then access is denied
```
 
### US-04 Record attendance and absence
 
```gherkin
Feature: Record attendance
Scenario: Doctor marks a student absent
Given the doctor teaches "Software Engineering"
And the student "Ali Hassan" is enrolled in it
When the doctor marks the student absent for the lecture of week 3
Then the absence is saved
And the student's absence count increases by 1
 
Scenario: Doctor records attendance for a course that is not his
Given the doctor does not teach "Databases"
When the doctor tries to record attendance for "Databases"
Then access is denied
 
Scenario: Attendance is recorded twice for the same lecture
Given attendance for "Ali Hassan" in week 3 is already recorded
When the doctor tries to record it again
Then the request is rejected with "Attendance already recorded"
```
 
### US-05 Instant AI feedback
 
```gherkin
Feature: AI feedback on assignments
Scenario: Student gets feedback before the doctor grades
Given the student "Ali Hassan" is enrolled in "Software Engineering"
And the doctor has not graded "Assignment 1" yet
When the student submits an answer
Then the submission is saved
And the student receives AI feedback immediately
And no score is shown to the student
 
Scenario: Student tries to submit twice
Given the student already submitted "Assignment 1"
When the student tries to submit again
Then the request is rejected with "You already submitted this assignment"
 
Scenario: AI service fails
Given the student submits "Assignment 1"
When the AI service does not respond
Then the submission is still saved
And the student sees "Feedback is not available now"
```
 
### US-06 Student dashboard
 
```gherkin
Feature: Student dashboard
Scenario: Student opens the dashboard
Given the student "Ali Hassan" is enrolled in 6 courses
When the student opens the dashboard
Then the attendance and absence count of each course are shown
And the grades of graded assignments are shown
And the assignments not yet submitted are listed with their deadlines
 
Scenario: Student has no pending tasks
Given the student has submitted all assignments
When the student opens the dashboard
Then the student sees "No pending tasks"
 
Scenario: Student tries to open another student's dashboard
Given the student "Sara Omar" is logged in
When she tries to open the dashboard of "Ali Hassan"
Then access is denied
```
 
### US-07 Dean chatbot
 
```gherkin
Feature: Dean chatbot
Scenario: Dean asks about a department's attendance
Given the user is logged in as super admin
And the department "Computer Science" has 40 students
When the dean asks "What is the average attendance in Computer Science?"
Then the chatbot answers with the average attendance of that department
 
Scenario: Non-dean tries to use the chatbot
Given the user is logged in as a doctor
When the doctor opens the dean chatbot
Then access is denied
 
Scenario: Question about a department that does not exist
Given the user is logged in as super admin
When the dean asks about the department "Physics"
Then the chatbot answers "Department not found"
```
 
## 4. Non-functional requirements
 
- NFR-01 (Performance) AI feedback appears to the student in under 10 seconds after submitting, for 95% of submissions, with 40 students on the platform. [Should]
- NFR-02 (Security) Passwords are stored hashed (bcrypt, cost >= 12). [Must]
- NFR-03 (Access control) Every request checks the user's role, and no user sees data outside his permissions (a doctor sees only his courses, a department admin only his department). Tested on each role with at least 3 pages. [Must]
- NFR-04 (Performance) The student dashboard opens in under 3 seconds for a student with 6 courses. [Should]
 
## 5. MVP scope
 
Must stories in the MVP: US-01, US-02, US-03, US-04, US-05, US-06, US-07
Must NFRs in the MVP: NFR-02, NFR-03
 
Reason: together they let the admin add courses and students, doctors upload content and record attendance, users log in with the right permissions, students submit work, get instant AI feedback and see their status in one dashboard, and the dean follow the whole college through the chatbot. The Should and Could stories (US-08 to US-16) stay in the backlog.