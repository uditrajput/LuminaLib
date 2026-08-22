Profile Management & Personalization Page

Update the existing Profile Management page based on the attached image. Keep the current design language, but improve the layout to make it modern, clean, minimal, responsive, and easy to scroll. The primary purpose of collecting this information is to understand the user's background, interests, and preferences so the AI can provide personalized book recommendations and better AI interactions.

1. Profile Completion Indicator

Place a circular profile-completion chart/progress indicator at the top of the page.

Display the overall profile completion percentage.
Example: Profile 65% Complete
The percentage should automatically increase/decrease as the user fills or removes information.
Use a visually attractive circular progress indicator.
Include a short message such as:
"Complete your profile to unlock better personalized book recommendations and AI experiences."
2. Profile Picture

Allow the user to:

Upload a profile picture.
Preview the uploaded image.
Change or remove the profile picture.
Support common image formats such as JPG, JPEG, and PNG.
3. Basic Profile

Create a Basic Profile section containing information such as:

User Name
Email Address
Date of Birth
Are you a:
	Student
	Working Professional
	Self-Employed
	Business Owner
	Other
Hobbies
Interests
Favorite Topics
Favorite Book Categories/Genres
Reading Preferences
Preferred Language
Any other information useful for understanding the user's personality and reading preferences.

Use appropriate UI controls such as:

Text fields
Date picker
Dropdowns
Multi-select fields
Tags/chips for hobbies and interests

For hobbies and interests, allow users to add and remove multiple values dynamically.

4. Education Profile

Create a dedicated Education Profile section.

Include high-level education information such as:

Highest Qualification
Specialization
Field of Study

The user should also be able to dynamically add multiple education records.

Each education record can contain:

Education Type
School
College
University
Degree
Diploma
Certification
Other
Institution/School/College/University Name
Degree/Qualification
Specialization/Field of Study
Start Year
End Year
Currently Studying
Additional details

Provide an "Add Education" button that dynamically creates another education form/card.

Each added education record should have options to:

Edit
Save
Remove

Use a clean card-based layout so multiple education records do not make the page visually overwhelming.

5. Contact Information

Create a Contact Information section.

Include the following fields:

Address
House Number
Floor
Street
Landmark
City/Village
District
State
Country
Pincode
Contact Numbers
Primary Mobile Number
Secondary Mobile Number

Keep the address form organized into logical rows/groups rather than displaying all fields in one long vertical list.

6. UX & Page Layout

The page should be designed for minimal scrolling and excellent usability.

Requirements:

Use collapsible/accordion sections where appropriate.
Keep each section visually separated.
Avoid unnecessarily large spacing.
Use cards or grouped containers for related information.
Keep the most important profile information visible near the top.
Make the page fully responsive for desktop, tablet, and mobile.
Provide clear Save, Cancel, and Edit actions where appropriate.
Preserve entered information when navigating between sections.
Show validation messages for required/invalid fields.
Clearly indicate which fields are optional and which are required.
7. First Login Profile Setup

Implement a first-login profile setup flow.

When a user:

Creates an account/signs up.
Logs in for the first time using their credentials.
Has not completed their profile yet.

Automatically redirect them to the Profile Management page instead of the normal home/dashboard page.

Display a welcome popup/modal:

"Complete Your Profile"

Message:

"To unlock the full potential of AI-powered book recommendations and personalized interactions, please complete your profile. The information you provide helps us understand your interests, education, hobbies, and preferences so we can recommend books that are more relevant to you."

Include:

Complete Profile → takes the user to the profile form.
Skip for Now → allows the user to continue, but keeps the profile incomplete.

The popup should appear only during the first login/profile setup, not every time the user logs in.

After the user completes the required profile information, mark the profile as completed and allow subsequent logins to go directly to the normal application dashboard/home page.

8. AI Personalization Purpose

The profile information should be structured so that it can later be used by the AI recommendation system.

The collected information should help the AI understand:

User's age group
Education level
Specialization
Professional/academic background
Hobbies
Interests
Favorite topics
Reading preferences
Preferred genres
Preferred language

This information will be used to generate:

Personalized book recommendations
Personalized reading suggestions
AI-generated reading lists
Personalized AI conversations
Recommended authors and genres
Learning/education-oriented recommendations
9. Visual Design

Follow the visual style of the attached reference image while improving the overall experience.

Design principles:

Modern
Minimal
Professional
Clean typography
Consistent spacing
Soft cards/containers
Clear section hierarchy
Attractive profile completion visualization
Smooth scrolling
Subtle animations/transitions
Mobile-first responsive design

Avoid making the page look like a large traditional registration form. It should feel like a modern personalized profile/dashboard experience.

10. Suggested Page Structure

Use the following overall hierarchy:

Profile Header

Profile Picture
User Name
Profile Completion Circle
Completion message

↓

Basic Profile

Personal information
Hobbies
Interests
Reading preferences

↓

Education Profile

Highest qualification
Specialization
Dynamic education records

↓

Contact Information

Address
Primary/secondary mobile numbers

↓

Profile Completion Summary

Completed sections
Missing recommended information
Final completion percentage

↓

Save Profile

The final result should provide a smooth, intuitive profile onboarding experience that encourages users to complete their information without overwhelming them, while collecting meaningful data that can be used to power AI-based personalized book recommendations and interactions.