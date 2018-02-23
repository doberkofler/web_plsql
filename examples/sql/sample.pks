CREATE OR REPLACE
PACKAGE sample IS

TYPE vc_arr IS TABLE OF VARCHAR2(2000) INDEX BY BINARY_INTEGER;

FUNCTION emptyArray RETURN vc_arr;

PROCEDURE pageIndex(p IN VARCHAR2 DEFAULT NULL);
PROCEDURE pageSimple(text IN VARCHAR2 DEFAULT NULL);
PROCEDURE pageFlexible(name_array IN owa.vc_arr, value_array IN owa.vc_arr);
PROCEDURE pageArray(text IN vc_arr);
PROCEDURE pageCGI;
PROCEDURE pageCookie;
PROCEDURE pageForm;
PROCEDURE pageFormProcess(firstname IN VARCHAR2 DEFAULT NULL, lastname IN VARCHAR2 DEFAULT NULL, age IN VARCHAR2 DEFAULT NULL, sex IN VARCHAR2 DEFAULT NULL, vehicle IN vc_arr  DEFAULT emptyArray);
PROCEDURE pageFileUpload;
PROCEDURE pageFileUploaded(name_array IN owa.vc_arr, value_array IN owa.vc_arr);
PROCEDURE pageRedirect;
PROCEDURE pageLocation;
PROCEDURE pageOther;

END sample;
/
