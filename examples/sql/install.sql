-- set the username
define SAMPLE_USER=sample

-- create user
CREATE USER &&SAMPLE_USER IDENTIFIED BY &&SAMPLE_USER;

-- assign privileges
GRANT create session TO &&SAMPLE_USER;
GRANT unlimited tablespace TO &&SAMPLE_USER;
GRANT create table TO &&SAMPLE_USER;
GRANT create view TO &&SAMPLE_USER;
GRANT create sequence TO &&SAMPLE_USER;
GRANT create procedure TO &&SAMPLE_USER;
GRANT execute on dbms_lob TO &&SAMPLE_USER;
GRANT execute on dbms_output TO &&SAMPLE_USER;
GRANT execute on dbms_lock TO &&SAMPLE_USER;

-- change schema
ALTER SESSION SET CURRENT_SCHEMA=&&SAMPLE_USER;

-- install document table
@doc_table.sql

-- install demo
@sample.pks
show errors
@sample.pkb
show errors

-- show errors
select * from user_errors;
