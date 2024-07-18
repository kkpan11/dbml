--SQL test for session policy related
CREATE SESSION POLICY mypol;
CREATE OR REPLACE SESSION POLICY "_mypol";
CREATE SESSION POLICY IF NOT EXISTS mypol;
CREATE SESSION POLICY TEST_SESSION_POL SESSION_UI_IDLE_TIMEOUT_MINS = 20 SESSION_IDLE_TIMEOUT_MINS = 10 COMMENT = 'Test session';
CREATE SESSION POLICY TEST_SESSION_POL COMMENT = 'Test session 2'  SESSION_UI_IDLE_TIMEOUT_MINS = 20 SESSION_IDLE_TIMEOUT_MINS = 10;
CREATE SESSION POLICY TEST_SESSION_POL COMMENT = 'Test session 3';

ALTER SESSION POLICY mypol UNSET SESSION_UI_IDLE_TIMEOUT_MINS;
ALTER SESSION POLICY mypol SET SESSION_IDLE_TIMEOUT_MINS = 20 SESSION_UI_IDLE_TIMEOUT_MINS = 20;
ALTER SESSION POLICY IF EXISTS mypol UNSET COMMENT;
ALTER SESSION POLICY IF EXISTS mypol RENAME TO myPol2;
ALTER SESSION POLICY IF EXISTS mypol SET TAG MyTag = 'aValue';
ALTER SESSION POLICY IF EXISTS mypol UNSET TAG MyTag;

DROP SESSION POLICY mypol;
DROP SESSION POLICY IF EXISTS mypol;