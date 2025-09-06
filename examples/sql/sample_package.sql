CREATE OR REPLACE
PACKAGE sample_pkg IS

TYPE vc_arr IS TABLE OF VARCHAR2(2000) INDEX BY BINARY_INTEGER;

FUNCTION emptyArray RETURN vc_arr;

PROCEDURE page_index(p IN VARCHAR2 DEFAULT NULL);
PROCEDURE pag_simple(text IN VARCHAR2 DEFAULT NULL);
PROCEDURE page_flexible(name_array IN owa.vc_arr, value_array IN owa.vc_arr);
PROCEDURE page_array(text IN vc_arr);
PROCEDURE page_slow;
PROCEDURE page_cgi;
PROCEDURE page_cookie;
PROCEDURE page_form;
PROCEDURE page_form_process(firstname IN VARCHAR2 DEFAULT NULL, lastname IN VARCHAR2 DEFAULT NULL, age IN VARCHAR2 DEFAULT NULL, sex IN VARCHAR2 DEFAULT NULL, vehicle IN vc_arr  DEFAULT emptyArray);
PROCEDURE page_file_upload;
PROCEDURE page_file_uploaded(name_array IN owa.vc_arr, value_array IN owa.vc_arr);
PROCEDURE page_redirect;
PROCEDURE page_location;
PROCEDURE page_other;
PROCEDURE page_path_alias(p_path IN VARCHAR2);
PROCEDURE page_exclusion_list;
PROCEDURE page_request_validation_function;
FUNCTION request_validation_function(p_proc_name IN VARCHAR2) RETURN BOOLEAN;

END sample_pkg;
/
