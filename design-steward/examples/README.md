# Acceptance example

Copy `fixture/` to a disposable project. Serve it locally and review at 390px and
1280px. Annotate the button radius, draw around it, and preview a different radius.
Export the capture and reinject after reload to check recovery. The imported edit
must remain a record rather than silently changing the freshly loaded button.

Audit should find the explicit 8px standard and the 6px button override. The
correct initial status is unresolved, not approval inferred from code. For this
synthetic scenario, the fixture author supplies the decision: use 8px for the
button and retain its full-width mobile behavior. Record that decision, write a
brief, change only the override, then verify computed radius, mobile width and
the button's Started result. Refresh the source baseline afterward.

The automated browser regression uses this fixture; it is not evidence of a
model-driven review, a user's real application, or the live Claude browser bridge.
