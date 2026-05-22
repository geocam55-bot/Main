Functional Specifications
1. Purpose of the Application
The software will allow users (builders, designers, estimators, architects) to:

Import house plans (single or multi‑floor)
Create an accurate digital model of interior walls, openings, and structural features
Add dimensions and annotations
Drag-and-drop interior doors, casings, baseboards, and mouldings
Produce takeoffs, cut lists, and material schedules


2. Core Modules
A. Project Setup
Features:

Create a new project
Define:

Number of floors
Default wall height(s)
Measurement units (imperial/metric)


Layer management (walls, trim, doors, notes, etc.)
Auto-save + version history


B. Drawing Import
Supported Input Formats:

PDF (typical architectural plans)
JPEG/PNG (scanned drawings)
DWG/DXF (CAD files)

Capabilities:

Automatic scale detection from known dimensions OR manual scale calibration
Ability to crop and isolate floor plans by level
Automatic edge detection (optional advanced feature)


C. Floor Plan Digitization
Users will recreate the structure using drawing tools.
1. Walls

Draw or trace walls on imported plan
Specify:

Wall length (auto or manual)
Wall thickness
Wall height (per wall or global setting)


Snap-to-grid and intelligent snapping to corners, midpoints, etc.

2. Openings
Interior Doors

Mark door rough openings
Input:

Width (e.g. 28”, 30”, 32”)
Height (80”, 84”, custom)
Swing direction (L/R)
In-swing / out-swing
Jamb size / wall depth



Exterior Doors & Windows

Mark openings on exterior walls
Specify:

Width, height
Sill height
Type (slider, casement, fixed, etc.)



3. Measurements
Must support:

Linear dimensioning between walls
Automatic wall-length measurement
Annotation tools for:

Ceiling height changes
Bulkheads
Structural beams
Stair locations



4. Room creation

Auto-detect room boundaries
User can name each room (Bedroom 1, Kitchen, etc.)


D. Trim & Door Builder
This is the drag-and-drop interface for finishing components.
1. Trim Library
Built-in categories:

Interior Doors

Single, double, bifold, barn door
Hollow-core/solid-core
Prehung or slab


Baseboards

Profiles (colonial, modern, ogee, shaker, etc.)
Heights


Casings

Profile and width options


Crown Moulding
Wainscotting / Panels (optional advanced)

Users can:

Preview profiles
Add custom profiles (DXF or image trace)

2. Drag-and-Drop Placement

Click a wall → Drag a door, casing style, or trim profile into place
Auto-fit behaviour:

Trim automatically wraps interior perimeters
Casing adjusts to door size


Options to rotate, flip, or mirror door swings
Trim application presets per room or whole house


E. 2D & 3D Visualization
2D Mode

Plan view with symbols and dimensions
Toggle layers (walls, doors, trim)

3D Mode

Realistic or simplified rendering
Walkthrough mode
Ability to see trim profiles in real geometry


F. Material Takeoffs
Automatically generate:

Linear footage of all trim types (baseboard, casing, crown)
Door counts by type and size
Window measurements (optional)
Cut list (boards needed, based on stock lengths)
Export formats:

Excel
PDF
CSV
Build materials list with SKU links (optional)




G. Exporting & Sharing

Export digital floor plan with trims applied
Save project files
Share via cloud link or PDF set
Optional integration with:

Revit
AutoCAD
Chief Architect
SketchUp




3. User Interface Requirements
UI Overview

Left panel: Tools (walls, openings, dimensions, trim library)
Right panel: Properties (exact measurements, profiles)
Top toolbar: Navigation, undo/redo, import, export
Center: Drawing canvas
Bottom: Floor selector (Main, Second Floor, Basement)


4. Advanced/Optional Features
Machine-learning tracing (premium):

Software automatically detects:

Walls
Doors
Windows


User verifies and corrects.

VR Mode

Walkthrough with an Oculus or similar headset.

Price Estimation Module

Link trim profiles to costs per linear foot
Auto-generate estimates