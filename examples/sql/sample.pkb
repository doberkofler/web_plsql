CREATE OR REPLACE
PACKAGE BODY sample IS

PROCEDURE openPage(title IN VARCHAR2);
PROCEDURE closePage;

PROCEDURE pageIndex(p IN VARCHAR2 DEFAULT NULL)
IS
BEGIN
	openPage('NODE-PLSQL SERVER - Index Page');
	htp.p('<ul>');
	htp.p('<li><a href="sample.pageSimple?text=some-text">Simple page</a></li>');
	htp.p('<li><a href="sample.pageTable?text=some-text">Simple page with a PL/SQL table argument</a></li>');
	htp.p('<li><a href="sample.pageArray?text=some-text'||CHR(38)||'text=more-text'||CHR(38)||'text=last-text">Array passing</a></li>');
	htp.p('<li><a href="!sample.pageFlexible?p1=v1'||CHR(38)||'p2=v2'||CHR(38)||'p3=v3.1'||CHR(38)||'p3=v3.2"">Flexible parameter passing</a></li>');
	htp.p('<li><a href="sample.pageCGI">CGI</a></li>');
	htp.p('<li><a href="sample.pageCookie">Cookies</a></li>');
	htp.p('<li><a href="sample.pageForm">Form</a></li>');
	htp.p('<li><a href="sample.pageFileUpload">File upload</a></li>');
	htp.p('<li><a href="sample.pageBlocking">Blocking</a></li>');
	htp.p('<li><a href="sample.pageRedirect">Redirect</a></li>');
	htp.p('<li><a href="sample.pageLocation">Change location</a></li>');
	htp.p('</ul>');
	closePage();
END pageIndex;

PROCEDURE pageSimple(text IN VARCHAR2 DEFAULT NULL)
IS
BEGIN
	openPage('NODE-PLSQL SERVER - Simple page');
	htp.p('<p>'||text||'</p>');
	closePage();
END pageSimple;

PROCEDURE pageTable(text IN vc_arr DEFAULT empty_vc_arr)
IS
BEGIN
	openPage('NODE-PLSQL SERVER - Simple page with a PL/SQL table argument');
	htp.p('<table>');
	htp.p('<tr><th>value</th></tr>');
	FOR i IN 1 .. text.COUNT LOOP
		htp.p('<tr><td>'||text(i)||'</td></tr>');
	END LOOP;
	htp.p('</table>');
	closePage();
END pageTable;

PROCEDURE pageArray(text IN vc_arr DEFAULT empty_vc_arr)
IS
BEGIN
	openPage('NODE-PLSQL SERVER - Array parameter passing');
	htp.p('<table>');
	htp.p('<tr><th>value</th></tr>');
	FOR i IN 1 .. text.COUNT LOOP
		htp.p('<tr><td>'||text(i)||'</td></tr>');
	END LOOP;
	htp.p('</table>');
	closePage();
END pageArray;

PROCEDURE pageFlexible(name_array IN owa.vc_arr, value_array IN owa.vc_arr)
IS
BEGIN
	openPage('NODE-PLSQL SERVER - Flexible parameter passing');
	htp.p('<table>');
	htp.p('<tr><th>name</th><th>value</th></tr>');
	FOR i IN 1 .. name_array.COUNT LOOP
		htp.p('<tr><td>'||name_array(i)||'</td><td>'||value_array(i)||'</td></tr>');
	END LOOP;
	htp.p('</table>');
	closePage();
END pageFlexible;

PROCEDURE pageCGI
IS
BEGIN
	openPage('NODE-PLSQL SERVER - CGI');
	htp.p('<table>');
	htp.p('<tr><th>name</th><th>value</th></tr>');
	FOR i IN 1 .. owa.num_cgi_vars LOOP
		htp.p('<tr><td>'||owa.cgi_var_name(i)||'</td><td>'||owa.cgi_var_val(i)||'</td></tr>');
	END LOOP;
	htp.p('</table>');
	closePage();
END pageCGI;

PROCEDURE pageCookie
IS
	names		owa_cookie.vc_arr;
	vals		owa_cookie.vc_arr;
	num_vals	INTEGER;
BEGIN
	owa_cookie.get_all(names=>names, vals=>vals, num_vals=>num_vals);

	owa_util.mime_header('text/html', FALSE);
	owa_cookie.send('demoCookie', TO_CHAR(SYSDATE, 'YYYY.MM.DD HH24:MI:SS'));
	owa_util.http_header_close;

	openPage('NODE-PLSQL SERVER - Cookies');
	htp.p('<table>');
	htp.p('<tr><th>name</th><th>value</th></tr>');
	FOR i IN 1 .. num_vals LOOP
		htp.p('<tr><td>'||names(i)||'</td><td>'||vals(i)||'</td></tr>');
	END LOOP;
	htp.p('</table>');
	closePage();
END pageCookie;

PROCEDURE pageForm
IS
BEGIN
	openPage('NODE-PLSQL SERVER - Form');
	htp.p('<form method="POST" action="sample.pageFormProcess">');
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
	closePage();
END pageForm;

PROCEDURE pageFormProcess(firstname IN VARCHAR2 DEFAULT NULL, lastname IN VARCHAR2 DEFAULT NULL, age IN VARCHAR2 DEFAULT NULL, sex IN VARCHAR2 DEFAULT NULL, vehicle IN vc_arr  DEFAULT empty_vc_arr)
IS
	PROCEDURE line(name IN VARCHAR2, value IN VARCHAR2)
	IS
	BEGIN
		htp.p('<tr><th>'||name||'</th><td>'||value||'</td></tr>');
	END line;
BEGIN
	openPage('NODE-PLSQL SERVER - Form processed');
	htp.p('<table>');
	line('firstname', firstname);
	line('lastname', lastname);
	line('age', age);
	line('sex', sex);
	FOR i IN 1 .. vehicle.COUNT LOOP
		line('vehicle '||i, vehicle(i));
	END LOOP;
	htp.p('</table>');
	closePage();
END pageFormProcess;

PROCEDURE pageFileUpload
IS
BEGIN
	openPage('NODE-PLSQL SERVER - File upload');
	htp.p('<form enctype="multipart/form-data" method="POST" action="!sample.pageFileUploaded">');
	htp.p('<p>File 1: <input type="file" name="file1" id="file1" /></p>');
	htp.p('<p>File 2: <input type="file" name="file2" id="file2" /></p>');
	htp.p('<p><input type="submit" name="submit" value"Upload" /></p>');
	htp.p('</form>');
	closePage();
END pageFileUpload;

PROCEDURE pageFileUploaded(name_array IN owa.vc_arr, value_array IN owa.vc_arr)
IS
BEGIN
	openPage('NODE-PLSQL SERVER - File uploaded');
	htp.p('<table>');
	htp.p('<tr><th>name</th><th>value</th></tr>');
	FOR i IN 1 .. name_array.COUNT LOOP
		htp.p('<tr><td>'||name_array(i)||'</td><td>'||value_array(i)||'</td></tr>');
	END LOOP;
	htp.p('</table>');
	closePage();
END pageFileUploaded;

PROCEDURE pageBlocking(secs IN NUMBER DEFAULT 60)
IS
	MINUTES		CONSTANT	PLS_INTEGER	:=	TRUNC(secs / 60, 0);
	SECONDS		CONSTANT	PLS_INTEGER	:=	secs - MINUTES * 60;
BEGIN
	openPage('NODE-PLSQL SERVER - Blocking');

	htp.p('<div id="countdown"></div>');

	htp.p('<script>
    var interval;
    var minutes = '||MINUTES||';
    var seconds = '||SECONDS||';

    window.onload = function() {
        countdown("countdown");
        self.top.location.replace("sample.pageDoesBlock");
    }

    function show(el) {
        if (minutes > 0) {
            var minute_text = minutes + (minutes > 1 ? " minutes" : " minute");
        } else {
            var minute_text = "";
        }
        var second_text = seconds > 1 ? "seconds" : "second";
        el.innerHTML = minute_text + " " + seconds + " " + second_text + " remaining";
    }

    function countdown(element) {
        var el = document.getElementById(element);
        show(el);
        interval = setInterval(function() {
            if (seconds == 0) {
                if(minutes == 0) {
                    el.innerHTML = "done";
                    clearInterval(interval);
                    return;
                } else {
                    minutes--;
                    seconds = 60;
                }
            }
            show(el);
            seconds--;
        }, 1000);
    }
</script>');

	closePage();
END pageBlocking;

PROCEDURE pageDoesBlock(secs IN NUMBER DEFAULT 60)
IS
BEGIN
	dbms_lock.sleep(secs);

	openPage('NODE-PLSQL SERVER - Blocking');
	htp.p('<p>This page has been blocking for "'||secs||'" seconds.</p>');
	closePage();
END pageDoesBlock;

PROCEDURE pageRedirect
IS
BEGIN
	owa_util.mime_header('text/html', FALSE);
	owa_cookie.send('fromPage', 'sample.pageRedirect');
	owa_util.redirect_url(curl=>'sample.pageOther', bclose_header=>FALSE);
	owa_util.http_header_close;
END pageRedirect;

PROCEDURE pageLocation
IS
BEGIN
	openPage('NODE-PLSQL SERVER - pageLocation');
	htp.p('<script>self.top.location.replace("sample.pageOther");</script>');
	closePage();
END pageLocation;

PROCEDURE pageOther
IS
BEGIN
	openPage('NODE-PLSQL SERVER - Other page');
	closePage();
END pageOther;

PROCEDURE openPage(title IN VARCHAR2)
IS
BEGIN
	htp.p('<html><head><title>'||title||'</title></head><body><h1>'||title||'</h1>');
	htp.p('<p>'||TO_CHAR(SYSDATE, 'YYYY.MM.DD HH24:MI:SS')||'</p>');
	htp.p('<p><a href="sample.pageIndex">Menu</a></p>');
END openPage;

PROCEDURE closePage
IS
BEGIN
	htp.p('</body></html>');
END closePage;

END sample;
/
