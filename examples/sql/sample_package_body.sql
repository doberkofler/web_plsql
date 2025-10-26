CREATE OR REPLACE
PACKAGE BODY sample_pkg IS

COOKIE_ACTION_REMOVE	CONSTANT	VARCHAR2(30)	:=	'REMOVE';
COOKIE_ACTION_SEND		CONSTANT	VARCHAR2(30)	:=	'SEND';

COOKIE_NAME_NO_EXPIRES	CONSTANT	VARCHAR2(30)	:=	'COOKIE_NO_EXPIRES';
COOKIE_NAME_ONE_DAY		CONSTANT	VARCHAR2(30)	:=	'COOKIE_ONE_DAY';

PROCEDURE open_page(title IN VARCHAR2);
PROCEDURE close_page;

FUNCTION emptyArray RETURN vc_arr
IS
	arr vc_arr;
BEGIN
	RETURN arr;
END emptyArray;

PROCEDURE page_index(p IN VARCHAR2 DEFAULT NULL)
IS
BEGIN
	open_page('web_plsql - Index Page');
	htp.p('<ul>');
	htp.p('<li><a href="sample_pkg.pag_simple?text=some-text">Simple page</a></li>');
	htp.p('<li><a href="sample_pkg.page_array?text=some-text'||CHR(38)||'text=more-text'||CHR(38)||'text=last-text">Array passing</a></li>');
	htp.p('<li><a href="!sample_pkg.page_flexible?p1=v1'||CHR(38)||'p2=v2'||CHR(38)||'p3=v3.1'||CHR(38)||'p3=v3.2"">Flexible parameter passing</a></li>');
	htp.p('<li><a href="sample_pkg.page_slow">Slow page (5 seconds)</a></li>');
	htp.p('<li><a href="sample_pkg.page_cgi">CGI</a></li>');
	htp.p('<li><a href="sample_pkg.page_cookie">Cookies</a></li>');
	htp.p('<li><a href="sample_pkg.page_form">Form</a></li>');
	htp.p('<li><a href="sample_pkg.page_file_upload">File upload</a></li>');
	htp.p('<li><a href="sample_pkg.page_redirect">Redirect</a></li>');
	htp.p('<li><a href="sample_pkg.page_location">Change location</a></li>');
	htp.p('<li><a href="sample_pkg.page_open_transaction">Transaction mode: custom handler</a></li>');
	htp.p('<li><a href="myalias">pathAlias configuration setting</a></li>');
	htp.p('<li><a href="sample_pkg.page_exclusion_list">Custom exclusion list</a></li>');
	htp.p('<li><a href="sample_pkg.page_request_validation_function">Request validation function</a></li>');
	htp.p('</ul>');
	close_page();
END page_index;

PROCEDURE pag_simple(text IN VARCHAR2 DEFAULT NULL)
IS
BEGIN
	open_page('web_plsql - Simple page');
	htp.p('<p>'||text||'</p>');
	close_page();
END pag_simple;

PROCEDURE page_slow
IS
	l_start  TIMESTAMP := SYSTIMESTAMP;
	l_now    TIMESTAMP;
BEGIN
	LOOP
		l_now := SYSTIMESTAMP;
		EXIT WHEN l_now >= l_start + INTERVAL '5' SECOND;
	END LOOP;

	open_page('web_plsql - Slow page');
	htp.p('<p>I am slow</p>');
	close_page();
END page_slow;

PROCEDURE page_array(text IN vc_arr)
IS
BEGIN
	open_page('web_plsql - Array parameter passing');
	htp.p('<table>');
	htp.p('<tr><th>value</th></tr>');
	FOR i IN 1 .. text.COUNT LOOP
		htp.p('<tr><td>'||text(i)||'</td></tr>');
	END LOOP;
	htp.p('</table>');
	close_page();
END page_array;

PROCEDURE page_flexible(name_array IN owa.vc_arr, value_array IN owa.vc_arr)
IS
BEGIN
	open_page('web_plsql - Flexible parameter passing');
	htp.p('<table>');
	htp.p('<tr><th>name</th><th>value</th></tr>');
	FOR i IN 1 .. name_array.COUNT LOOP
		htp.p('<tr><td>'||name_array(i)||'</td><td>'||value_array(i)||'</td></tr>');
	END LOOP;
	htp.p('</table>');
	close_page();
END page_flexible;

PROCEDURE page_cgi
IS
BEGIN
	open_page('web_plsql - CGI');
	htp.p('<table>');
	htp.p('<tr><th>name</th><th>value</th></tr>');
	FOR i IN 1 .. owa.num_cgi_vars LOOP
		htp.p('<tr><td>'||owa.cgi_var_name(i)||'</td><td>'||owa.cgi_var_val(i)||'</td></tr>');
	END LOOP;
	htp.p('</table>');
	close_page();
END page_cgi;

PROCEDURE page_cookie(p_action IN VARCHAR2 DEFAULT NULL)
IS
	l_names		owa_cookie.vc_arr;
	l_vals		owa_cookie.vc_arr;
	l_num_vals	INTEGER;
BEGIN
	CASE UPPER(p_action)

	WHEN COOKIE_ACTION_REMOVE THEN
		owa_util.mime_header('text/html', FALSE);

		owa_cookie.remove(name=>COOKIE_NAME_NO_EXPIRES, val=>'');
		owa_cookie.remove(name=>COOKIE_NAME_ONE_DAY, val=>'');

		owa_util.redirect_url('sample_pkg.page_cookie');
		owa_util.http_header_close;

	WHEN COOKIE_ACTION_SEND THEN
		owa_util.mime_header('text/html', FALSE);

		owa_cookie.send(name=>COOKIE_NAME_NO_EXPIRES, value=>'VALUE-' || TO_CHAR(TRUNC(dbms_random.value(1, 101))));
		owa_cookie.send(name=>COOKIE_NAME_ONE_DAY, value=>'VALUE-' || TO_CHAR(TRUNC(dbms_random.value(1, 101))), expires=>SYSDATE + 1);

		owa_util.redirect_url('sample_pkg.page_cookie');
		owa_util.http_header_close;

	ELSE
		owa_cookie.get_all(names=>l_names, vals=>l_vals, num_vals=>l_num_vals);

		open_page('web_plsql - Cookies');

		-- actions
		htp.p('<p>');
		htp.p('<form method="POST" action="sample_pkg.page_cookie">');
		htp.p('<input type="submit" name="p_action" value="' || COOKIE_ACTION_REMOVE || '">');
		htp.p('<input type="submit" name="p_action" value="' || COOKIE_ACTION_SEND || '">');
		htp.p('</form>');
		htp.p('</p>');

		-- show cookies
		htp.p('<table>');
		htp.p('<tr><th>name</th><th>value</th></tr>');
		FOR i IN 1 .. l_num_vals LOOP
			htp.p('<tr><td>'||l_names(i)||'</td><td>'||l_vals(i)||'</td></tr>');
		END LOOP;
		htp.p('</table>');

		close_page();

	END CASE;
END page_cookie;

PROCEDURE page_form
IS
BEGIN
	open_page('web_plsql - Form');
	htp.p('<form method="POST" action="sample_pkg.page_form_process">');
	htp.p('<table>');
	htp.p('<tr><td>First name:</td><td><input type="text" name="firstname"></td></tr>');
	htp.p('<tr><td>Last name:</td><td><input type="text" name="lastname"></td></tr>');
	htp.p('<tr><td>Age:</td><td><input type="text" name="age"></td></tr>');
	htp.p('<tr><td colspan="2"><input type="radio" name="sex" value="male">Male</td></tr>');
	htp.p('<tr><td colspan="2"><input type="radio" name="sex" value="female">Female</td></tr>');
	htp.p('<tr><td colspan="2"><input type="checkbox" name="vehicle" value="Bike">I have a bike</td></tr>');
	htp.p('<tr><td colspan="2"><input type="checkbox" name="vehicle" value="Car">I have a car </td></tr>');
	htp.p('<tr><td colspan="2"><input type="submit" value="Submit"></td></tr>');
	htp.p('</table>');
	htp.p('</form>');
	close_page();
END page_form;

PROCEDURE page_form_process(firstname IN VARCHAR2 DEFAULT NULL, lastname IN VARCHAR2 DEFAULT NULL, age IN VARCHAR2 DEFAULT NULL, sex IN VARCHAR2 DEFAULT NULL, vehicle IN vc_arr  DEFAULT emptyArray)
IS
	PROCEDURE line(name IN VARCHAR2, value IN VARCHAR2)
	IS
	BEGIN
		htp.p('<tr><th>'||name||'</th><td>'||value||'</td></tr>');
	END line;
BEGIN
	open_page('web_plsql - Form processed');
	htp.p('<table>');
	line('firstname', firstname);
	line('lastname', lastname);
	line('age', age);
	line('sex', sex);
	FOR i IN 1 .. vehicle.COUNT LOOP
		line('vehicle '||i, vehicle(i));
	END LOOP;
	htp.p('</table>');
	close_page();
END page_form_process;

PROCEDURE page_file_upload
IS
BEGIN
	open_page('web_plsql - File upload');
	htp.p('<form enctype="multipart/form-data" method="POST" action="!sample_pkg.page_file_uploaded">');
	htp.p('<p>File 1: <input type="file" name="file1" /></p>');
	htp.p('<p>File 2: <input type="file" name="file2" /></p>');
	htp.p('<p>File 3: <input type="file" name="file3" /></p>');
	htp.p('<p><input type="submit" name="submit" value"Upload" /></p>');
	htp.p('</form>');
	close_page();
END page_file_upload;

PROCEDURE page_file_uploaded(name_array IN owa.vc_arr, value_array IN owa.vc_arr)
IS
BEGIN
	open_page('web_plsql - File uploaded');
	htp.p('<table>');
	htp.p('<tr><th>name</th><th>value</th></tr>');
	FOR i IN 1 .. name_array.COUNT LOOP
		htp.p('<tr><td>'||name_array(i)||'</td><td>'||value_array(i)||'</td></tr>');
	END LOOP;
	htp.p('</table>');
	close_page();
END page_file_uploaded;

PROCEDURE page_redirect
IS
BEGIN
	owa_util.mime_header('text/html', FALSE);
	owa_cookie.send('fromPage', 'sample_pkg.page_redirect');
	owa_util.redirect_url(curl=>'sample_pkg.page_other', bclose_header=>FALSE);
	owa_util.http_header_close;
END page_redirect;

PROCEDURE page_location
IS
BEGIN
	open_page('web_plsql - page_location');
	htp.p('<script>self.top.location.replace("sample_pkg.page_other");</script>');
	close_page();
END page_location;

PROCEDURE page_open_transaction
IS
	l_name CONSTANT docTable.name%TYPE := 'page_open_transaction';
BEGIN
	open_page('web_plsql - Transaction mode: custom handler');

	DELETE docTable WHERE name = l_name;
	INSERT INTO docTable (name) VALUES (l_name);

	close_page();
END page_open_transaction;

PROCEDURE page_path_alias(p_path IN VARCHAR2)
IS
BEGIN
	open_page('web_plsql - pathAlias page');
	htp.p('<p>p_path: "'||p_path||'"</p>');
	close_page();
END page_path_alias;

PROCEDURE page_exclusion_list
IS
BEGIN
	open_page('web_plsql - page_exclusion_list');
	close_page();
END page_exclusion_list;

PROCEDURE page_request_validation_function
IS
BEGIN
	open_page('web_plsql - page_request_validation_function');
	close_page();
END page_request_validation_function;

FUNCTION request_validation_function(p_proc_name IN VARCHAR2) RETURN BOOLEAN
IS
BEGIN
	RETURN LOWER(p_proc_name) != 'sample_pkg.page_request_validation_function';
END request_validation_function;

PROCEDURE open_page(title IN VARCHAR2)
IS
BEGIN
	htp.p('<!DOCTYPE html>');
	htp.p('<html>');
	htp.p('<head>');
	htp.p('<title>'||title||'</title>');
	htp.p('<meta charset="utf-8">');
	htp.p('<link rel="stylesheet" type="text/css" href="/static/sample.css" />');
	htp.p('</head>');
	htp.p('<body>');
	htp.p('<h1>'||title||'</h1>');
	htp.p('<p><a href="sample_pkg.page_index">Menu</a></p>');
END open_page;

PROCEDURE close_page
IS
BEGIN
	htp.p('</body>');
	htp.p('</html>');
END close_page;

BEGIN
	dbms_random.seed(TO_CHAR(SYSDATE,'MM-DD-YYYY HH24:MI:SS'));

END sample_pkg;
/
