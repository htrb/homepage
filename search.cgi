#!/usr/local/bin/perl

require './jcode.pl'; 

sub put_count {
  local($filename, $pattern, $count) = @_;
  print "<table border BORDER=1 CELLSPACING=0><tr align=\"center\"><th>Key Word</th><th>Hits</th></tr>";
  print "<tr align=\"center\"><td>$pattern</td><td>$count\n</td></tr></table><br>\n";
  print "<TABLE border BORDER=1 CELLSPACING=0>\n";
  open(INPUTFILE, $filename);
  while($line = <INPUTFILE>){
    &jcode'convert(*line, 'euc');      #';# 日本語は1つのコード系に統一する
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
#↑POSTの場合は標準入力からのデータを $str にいれる
#  (いつでもpostに拡張できるようにPOSTの場合の処理もかいておく)

@part = split('&', $str);
foreach $i (@part) {
  ($variable, $value) = split('=', $i);
  $value =~ tr/+/ /;
  $value =~ s/%([0-9a-fA-F][0-9a-fA-F])/pack("C", hex($1))/eg;
  &jcode'convert(*value, 'euc');      #';# 日本語は1つのコード系に統一する'
  $value =~ s/</&lt;/g;   #←タグを埋め込むことをできないようにするために
  $value =~ s/>/&gt;/g;   #  「<」と「>」は記号として出力させる
  $value =~ s/\r\n/\n/g;  #←(DOSの改行コードを)UNIXに統一する
  $value =~ s/\r/\n/g;    #←(MACの改行コードを)UNIXに統一する
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
  <A HREF=\"$home/search.html\">戻る</A><BR>

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
      &jcode'convert(*line, 'euc');    #';# 日本語は1つのコード系に統一する
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
      &jcode'convert(*line, 'euc');    #';# 日本語は1つのコード系に統一する
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
  print "検索文字列は３文字以上にしてください。\n</body>\n</html>\n";
}
