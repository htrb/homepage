#! /bin/sh

DB_PATH="$HOME/.gsuica/station_code"

if [ ! -d $DB_PATH ]
then
  mkdir -p $DB_PATH
fi

for i in 0 1 2 3 4 5
do
 echo converting databese $i
 xlhtml -csv -xp:$i -m $1 |nkf -Sw > $DB_PATH/StationCode$i.csv
done
