#!/usr/local/bin/perl

require './jcode.pl'; 

sub put_count {
  local($filename, $pattern, $count) = @_;
  print "<table border BORDER=1 CELLSPACING=0><tr align=\"center\"><th>Key Word</th><th>Hits</th></tr>";
  print "<tr align=\"center\"><td>$pattern</td><td>$count\n</td></tr></table><br>\n";
  print "<TABLE border BORDER=1 CELLSPACING=0>\n";
  open(INPUTFILE, $filename);
  while($line = <INPUTFILE>){
    &jcode'convert(*line, 'euc');      #';# ���ܸ��1�ĤΥ����ɷϤ����줹��
    print "$line";
  }
  close(INPUTFILE);
}

print "Content-type: text/html\n\n";

if ($ENV{'REQUEST_METHOD'} eq "POST") {
  read(STDIN, $str, $ENV{'CONTENT_LENGTH'});
} else {
  $str = $ENV{'QUERY_STRING'};
}
#��POST�ξ���ɸ�����Ϥ���Υǡ����� $str �ˤ����
#  (���ĤǤ�post�˳�ĥ�Ǥ���褦��POST�ξ��ν����⤫���Ƥ���)

@part = split('&', $str);
foreach $i (@part) {
  ($variable, $value) = split('=', $i);
  $value =~ tr/+/ /;
  $value =~ s/%([0-9a-fA-F][0-9a-fA-F])/pack("C", hex($1))/eg;
  &jcode'convert(*value, 'euc');      #';# ���ܸ��1�ĤΥ����ɷϤ����줹��'
  $value =~ s/</&lt;/g;   #�������������ळ�Ȥ�Ǥ��ʤ��褦�ˤ��뤿���
  $value =~ s/>/&gt;/g;   #  ��<�פȡ�>�פϵ���Ȥ��ƽ��Ϥ�����
  $value =~ s/\r\n/\n/g;  #��(DOS�β��ԥ����ɤ�)UNIX�����줹��
  $value =~ s/\r/\n/g;    #��(MAC�β��ԥ����ɤ�)UNIX�����줹��
  $cgi{$variable} = $value;
}
#========================================================================

$color = "#FF0000";
$home  = "http://hito.music.coocan.jp";

$action   = $cgi{'ACTION'};
$datafile = $cgi{'FILE'};
#$datafile = "trombone";
$pattern  = $cgi{'WORD'};

if(length($action) < 1){
  $action = "http://hito.music.coocan.jp/search.cgi"
}

print <<EOF;
  <HTML>
  <HEAD>
  <TITLE>CD Search</TITLE>
  <META http-equiv=\"Content-Type\" content=\"text/html; charset=EUC-JP\">

  <LINK REV=MADE HREF=\"mailto:ZXB01226\@nifty.ne.jp\">
  </HEAD>
  <BODY>
  <BODY TEXT=\"#FFFFFF\" BGCOLOR=\"#000000\" LINK=\"#00FFFF\" VLINK=\"#EE82EE\" ALINK=\"#EEEE82\">
  <BR>
  <A HREF=\"$home/search.html\">���</A><BR>

  <FORM ACTION=\"$action\" METHOD=\"POST\">
  <INPUT TYPE=\"hidden\" NAME=\"ACTION\" VALUE=\"$action\">
  <INPUT TYPE=\"hidden\" NAME=\"FILE\" VALUE=\"$datafile\">
  <INPUT TYPE=\"text\" NAME=\"WORD\" SIZE=\"20\" MAXLENGTH=\"30\">
  <INPUT TYPE=\"submit\" VALUE=\"Search\"><BR>
  <INPUT TYPE=\"submit\" NAME=\"WORD\" VALUE=\"ALL\"><BR>
  </FORM>
EOF


if(length($pattern) > 2){
  if($pattern ne "ALL"){
    open(INPUTFILE, $datafile);
    while($line = <INPUTFILE>){
      &jcode'convert(*line, 'euc');    #';# ���ܸ��1�ĤΥ����ɷϤ����줹��
      if($line =~ /$pattern/i){
	$line =~ s/($pattern)/<FONT COLOR="$color"><EM>$1<\/EM><\/FONT>/gi;
	push(@hit_str, $line);
      }
    }
    close(INPUTFILE);

    $count = @hit_str;
    &put_count($datafile . ".hed", $pattern, $count);

    for($i = 0; $i < $count; $i++){
      print "@hit_str[$i]";
    }
  }else{
    open(INPUTFILE, $datafile);
    while($line = <INPUTFILE>){
      &jcode'convert(*line, 'euc');    #';# ���ܸ��1�ĤΥ����ɷϤ����줹��
      push(@hit_str, $line);
    }
    close(INPUTFILE);

    $count = @hit_str;
    &put_count($datafile . ".hed", $pattern, $count);

    for($i = 0; $i < $count; $i++){
      print "@hit_str[$i]";
    }
  }
  print "</table>\n</body>\n</html>\n"
}else{
  print "����ʸ����ϣ�ʸ���ʾ�ˤ��Ƥ���������\n</body>\n</html>\n";
}
