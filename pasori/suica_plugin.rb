# -*- coding: utf-8 -*-
# $Id: ui.rb,v 1.18 2008-12-27 15:25:22 hito Exp $

begin
require "pasori"
class Suica
  InOutType = {
    0x2000 => '出場',
    0x4000 => '出定',
    0xa000 => '入場',
    0xc000 => '入定',
    0x0040 => '清算',
  }

  IN_OUT_TYPE_IN = [0xA0, 0xC0]

  TerminalType = {
    0x03 => '精算機',
    0x05 => '車載端末',
    0x07 => '券売機',
    0x08 => '券売機',
    0x09 => '入金機',
    0x12 => '券売機',
    0x14 => '券売機等',
    0x15 => '券売機等',
    0x16 => '改札機',
    0x17 => '簡易改札機',
    0x18 => '窓口端末',
    0x19 => '窓口端末',
    0x1A => '改札端末',
    0x1B => '携帯電話',
    0x1C => '乗継精算機',
    0x1D => '連絡改札機',
    0x1F => '簡易入金機',
    0x23 => '新幹線改札機',
    0x46 => 'VIEW ALTTE',
    0x48 => 'VIEW ALTTE',
    0xC7 => '物販端末',
    0xC8 => '自販機',
  }

  ExpenseType = {
    0x01 => '改札出場',
    0x02 => 'チャージ',
    0x03 => '磁気券購入',
    0x04 => '精算',
    0x05 => '入場精算',
    0x06 => '改札窓口処理',
    0x07 => '新規発行',
    0x08 => '窓口控除',
    0x0d => 'バス',
    0x0f => 'バス',
    0x11 => '再発行処理',
    0x13 => '支払(新幹線利用)',
    0x14 => '入場時オートチャージ',
    0x15 => '出場時オートチャージ',
    0x1f => 'バスチャージ',
    0x23 => 'バス路面電車企画券購入',
    0x46 => '物販',
    0x48 => '特典チャージ',
    0x49 => 'レジ入金',
    0x4a => '物販取消',
    0x4b => '入場物販',
    0xc6 => '現金併用物販',
    0xcb => '入場現金併用物販',
    0x84 => '他社精算',
    0x85 => '他社入場精算',
  }

  TYPE_SHOP = 0xC7
  TYPE_VEND = 0xC8
  TYPE_CAR  = 0x05


  EXPENSE_TRAIN = [0x01]
  EXPENSE_TRAIN_MISC = [0x03, 0x04, 0x05, 0x06, 0x07, 0x11, 0x13, 0x84, 0x85]
  EXPENSE_TRAIN_ALL = [EXPENSE_TRAIN, EXPENSE_TRAIN_MISC].flatten

  EXPENSE_BUS = [0x0d, 0x0f, 0x23]
  EXPENSE_SHOP  = [0x46, 0xc6, 0xcb]
  EXPENSE_CHARGE = [0x02, 0x1f, 0x49]
  EXPENSE_ACHARGE = [0x14, 0x15]
  EXPENSE_GIFT = [0x48]

  EXPENSE_CHARGE_ALL = [EXPENSE_CHARGE, EXPENSE_ACHARGE].flatten

  MARSHAL_FILE = "StationCode.bin"

  require 'csv'

  attr_reader :in_out, :history, :idm

  class DB
    DB_TYPE_TRAIN = 0
    DB_TYPE_SHOP  = 1
    DB_TYPE_CAR   = 3

    DB_TYPE = [DB_TYPE_TRAIN, DB_TYPE_SHOP, DB_TYPE_CAR]

    DB_FILE = "StationCode"
    USER_FILE = "UserData"

    SHOP_REGION_SUICA = 1
    SHOP_REGION_ICOCA = 2
    SHOP_REGION_IRUCA = 4

    attr_accessor :shop_region

    def initialize(path)
      @user_data = {}
      @db_shop = {}
      @db_car = {}
      @db_train = {}
      @db_path = path
      DB_TYPE.each {|type|
        read_db("#{path}/#{DB_FILE}#{type}.csv", 3, type, false)
      }
      @shop_region = SHOP_REGION_SUICA
    end

    def get_station(t, r, l, s)
      a = code2str(t, r, l, s)

      if (a)
        [a[0], a[1]]
      else
        if (s == -1 && l == -1)
          ["", ""]
        elsif (s == 0 && l == 0)
          ["", ""]
        else
          [sprintf("不明(%02x)", l),  sprintf("不明(%02x)", s)]
        end
      end
    end

    def code2str(t, r, l, s)
      return ["",""] if ((l == 0 && s == 0) || (l.nil? && s.nil?))

      case (t)
      when TYPE_SHOP, TYPE_VEND
        db = @db_shop
        r = @shop_region
      when TYPE_CAR
        db = @db_car
        t = -1
        r = -1
      else
        db = @db_train
        t = -1
      end

      r = -1 if (r.nil?)
      t = -1 if (t.nil?)

      d = db[[t, r, l, s].pack("n4")]
      return d
    end

    def read_user_db
      DB_TYPE.each {|type|
        read_db("#{@db_path}/#{USER_FILE}#{type}.csv", 0, type, true)
      }
    end

    def read_db(file, skip, type, user_data)
      return unless (FileTest.readable?(file))

      case (type)
      when DB_TYPE_TRAIN
        _read_db(@db_train, file, skip, [-1,  0, 1, 2], 3, 5, 9, user_data)
      when DB_TYPE_SHOP
        _read_db(@db_shop, file, skip, [ 1,  0, 2, 3], 4, 5, 8, user_data)
      when DB_TYPE_CAR
        _read_db(@db_car, file, skip, [-1, -1, 0, 1], 2, 4, 6, user_data)
      end
    end

    def _read_db(data, file, skip, key_col, col3, col4, col_num, user_data)
      i = 0
      user_db = {} if (user_data)
      key_val = [0, 0, 0, 0]
      CSV.foreach(file) {|d|
        i += 1
        next if (i < skip || d.size != col_num)

        begin
          key_col.each_with_index {|k, c|
            key_val[c] = (k < 0) ? -1: d[k].hex
          }
        rescue
          next
        end

        l = key_val.pack("n4")
        data[l] = [d[col3].to_s, d[col4].to_s]
        if (user_data)
          user_db[l] = [d[col3].to_s, d[col4].to_s]
        end
      }
      @user_data[file] = user_db if (user_data)
      data
    end

    def save_user_db
      DB_TYPE.each {|type|
        file = "#{@db_path}/#{USER_FILE}#{type}.csv"
        db = @user_data[file]
        next unless (db)

        _save_db(file, db) {|terminal, region, lcode, scode, l, s|
          case (type)
          when DB_TYPE_TRAIN
            [region, lcode, scode, l, nil, s, nil, nil, nil]
          when DB_TYPE_SHOP
            [region, terminal, lcode, scode, l, s, nil, nil]
          when DB_TYPE_CAR
            [lcode, scode, l, nil, s, nil]
          end
        }
      }
    end

    def _save_db(file, db, &block)
      dir = File.dirname(file)
      FileUtils.makedirs(dir) unless (File.exist?(dir))
      begin
        File.open(file, "w") {|f|
          db.each {|key, val|
            code = key.unpack("n4")
            data = yield(code[0], code[1], code[2], code[3], val[0], val[1])
            f.puts(Suica::ary2csv(data))
          }
        }
      rescue => ever
        @plugin.err_message("データ保存時にエラーが発生しました。\n#{ever.to_s}")
      end
    end

    def update_db(terminal, region, lcode, scode, l, s)
      case (terminal)
      when TYPE_SHOP, TYPE_VEND
        db = @db_shop
        db_type = DB_TYPE_SHOP
        region = @shop_region
      when TYPE_CAR
        db = @db_car
        terminal = -1
        region = -1
        db_type = DB_TYPE_CAR
      else
        db = @db_train
        terminal = -1
        db_type = DB_TYPE_TRAIN
      end

      file = "#{@db_path}/#{USER_FILE}#{db_type}.csv"

      k = [terminal, region, lcode, scode].pack("n4")
      db[k] = [l, s]

      @user_data[file] = {} unless (@user_data.key?(file))
      @user_data[file][k] = [l, s]
    end

    def get_train_region(r, l)
      if (r == 0 && l < 0x80)
        0
      elsif (r == 0 && l >= 0x80)
        1
      elsif (r == 1)
        2
      else
        0
      end
    end
  end

  class Data
    TYPE_IN_OUT = 0x00
    TYPE_HISTORY = 0x01

    attr_reader :data_type, :terminal, :manage_type, :date, :time,
    :in_line, :in_station, :out_line, :out_station,
    :balance, :expense, :number, :region, :binary

    def initialize(type, bin, db)
      @db = db
      @type = type
      case (type)
      when TYPE_IN_OUT
        parse_in_out_data(bin)
      when TYPE_HISTORY
        parse_history_data(bin)
      end
      update
    end

    def get_type(data)
      if (data[0] != 0 && data[1] == 0)
        TYPE_IN_OUT
      else
        TYPE_HISTORY
      end
    end

    def update
      case (@type)
      when TYPE_IN_OUT
        set_in_out_data
      when TYPE_HISTORY
        set_history_data
      end
    end

    def parse_history_data(data)
      d = data.unpack('CCnnCCCCvN')
      @data_type = TYPE_HISTORY
      @terminal = [d[0], nil]
      @manage_type = [d[1], nil]
      @date = [d[3], nil]

      case (d[0])
      when TYPE_SHOP, TYPE_VEND
        @in_line = [d[6], nil]
        @in_station = [d[7], nil]
        @out_line = [nil, nil]
        @out_station = [nil, nil]
        @time = [((d[4] << 8) + d[5]) >> 5, nil]
        @region = [d[9] & 0xff, nil]
      when TYPE_CAR
        @in_line = [(d[4] << 8) + d[5], nil]
        @in_station = [(d[6] << 8) + d[7], nil]
        @out_line = [nil, nil]
        @out_station = [nil, nil]
        @time = [nil, nil]
        @region = [nil, nil]
      else
        @in_line = [d[4], nil]
        @in_station = [d[5], nil]
        @out_line = [d[6], nil]
        @out_station = [d[7], nil]
        @time = [nil, nil]
        @region = [(d[9] >> 4) & 0xf, nil]
      end

      @balance = [d[8], nil]
      @expense = [nil, nil]
      @number = [d[9] >> 8, nil]
      @binary = [data, nil]
    end

    def set_history_data
      @terminal[1] = check_val(TerminalType, @terminal[0])
      @manage_type[1] = check_val(ExpenseType, @manage_type[0])

      y = (@date[0] >> 9) + 2000
      m = (@date[0] >> 5) & 0b1111
      d = @date[0] & 0b11111
      @date[1] = sprintf("%04d/%02d/%02d", y, m, d)

      @in_line[1], @in_station[1] =
        @db.get_station(@terminal[0],
                        @region[0] ? (@region[0] >> 2) & 0x3 : @region[0],
                        @in_line[0], @in_station[0])

      @out_line[1], @out_station[1] =
        @db.get_station(@terminal[0],
                        @region[0] ? @region[0] & 0x3: @region[0],
                        @out_line[0], @out_station[0])

      if(@time[0])
        @time[1] = sprintf("%02d:%02d", @time[0] >> 6, @time[0] & 0x3f)
      else
        @time[1] = ""
      end

      @balance[1] = @balance[0].to_s
      @expense[1] = ""
      @number[1] = @number[0].to_s
      @region[1] = @region[0].to_s

      @binary[1] = Suica::hex_dump(@binary[0])
    end

    def parse_in_out_data(data)
      d = data.unpack('nCCCCnnvN')
      @data_type = [TYPE_IN_OUT, NIL]
      @terminal = [nil, nil]
      @manage_type = [d[0], nil]
      @date = [d[5], nil]
      @time = [d[6], nil]

      if (IN_OUT_TYPE_IN.include?(d[0]))
        @in_line = [d[1], nil]
        @in_station = [d[2], nil]
        @out_line = [nil, nil]
        @out_station = [nil, nil]
      else
        @in_line = [nil, nil]
        @in_station = [nil, nil]
        @out_line = [d[1], nil]
        @out_station = [d[2], nil]
      end
      @balance = [nil, nil]
      @expense = [d[7], nil]
      @number = [nil, nil]
      @region = [d[8] & 0xff, nil] # Fix me: is it right?
      @binary = [data, nil]
    end

    def set_in_out_data
      y = (@date[0] >> 9) + 2000
      m = (@date[0] >> 5) & 0x0f
      d = @date[0] & 0x1f

      row = []
      @terminal[1] = ""
      @manage_type[1] = InOutType[@manage_type[0]]
      @date[1] = sprintf("%04d/%02d/%02d", y, m, d)
      @time[1] = sprintf("%02x:%02x", @time[0] >> 8, @time[0] & 0xff)

      @in_line[1], @in_station[1] =
        @db.get_station(@terminal[0], (@region[0] >> 2) & 0x3, @in_line[0], @in_station[0])
      @out_line[1], @out_station[1] =
        @db.get_station(@terminal[0], @region[0] & 0x3, @out_line[0], @out_station[0])

      @balance[1] = ""
      @expense[1] = @expense[0].to_s
      @number[1] = ""
      @region[1] = ""

      @binary[1] = Suica::hex_dump(@binary[0])
    end

    def check_val(hash, val)
      v = hash[val]
      if (v)
        v
      else
        sprintf("不明(%02x)", val)
      end
    end

    def to_s
      @binary[1]
    end
  end

  def initialize(path)
    if (check_db_marshal(path))
      File.open("#{path}/#{MARSHAL_FILE}", "r") {|f|
        @db = Marshal.load(f)
      }
    else
      @db = DB.new(path)
    end
    @db.read_user_db
    @idm = nil

    read_type("#{path}/InOut.csv", InOutType)
    read_type("#{path}/Terminal.csv", TerminalType)
    read_type("#{path}/Type.csv", ExpenseType)

    @db_path = path
    @user_type_modified = false
  end

  def shop_region=(region)
    @db.shop_region = region
  end

  def get_data
    Pasori.open {|pasori|
      felica = pasori.felica_polling(Felica::POLLING_SUICA)
      if (felica.nil?)
        felica = pasori.felica_polling(Felica::POLLING_IRUCA)
      end

      return if (felica.nil?)

      @idm = felica.idm

      @in_out = []
      felica.foreach(Felica::SERVICE_SUICA_IN_OUT) {|l|
        @in_out.push(Data.new(Data::TYPE_IN_OUT, l, @db))
      }

      @history = []
      felica.foreach(Felica::SERVICE_SUICA_HISTORY) {|l|
        @history.push(Data.new(Data::TYPE_HISTORY, l, @db))
      }
      felica.close
    }
  end

  def save_user_db
    @db.save_user_db
  end

  def update_db(data, lcode, scode, l, s)
    @db.update_db(data.terminal[0], data.region[0], lcode, scode, l, s)
  end

  def update_terminal(type, code, text)
    if (type == Data::TYPE_IN_OUT)
      InOutType[code] = text
    else
      TerminalType[code] = text
    end
    @user_type_modified = true
  end

  def update_type(code, text)
    ExpenseType[code] = text
    @user_type_modified = true
  end

  def save_db
    save_db_marshal("#{@db_path}/#{MARSHAL_FILE}") if (! check_db_marshal(@db_path))
  end

  def save_user_data
    return unless (@user_type_modified)
    save_type("#{@db_path}/Terminal.csv", TerminalType)
    save_type("#{@db_path}/InOut.csv", InOutType)
    save_type("#{@db_path}/Type.csv", ExpenseType)
  end

  def read_type(file, hash)
    return unless (FileTest.readable?(file))
    File.foreach(file) { |l|
      a = l.chomp.split(',')
      hash[a[0].hex] = a[1]
    }
  end

  def save_type(file, hash)
    dir = File.dirname(file)
    FileUtils.makedirs(dir) unless (File.exist?(dir))
    begin
      File.open(file, "w") {|f|
        hash.each {|k, v|
          f.printf("%02x,%s\n", k, v)
        }
      }
    rescue => ever
      @plugin.err_message("データ保存時にエラーが発生しました。\n#{ever.to_s.toutf8}", self)
    end
  end

  def check_db_marshal(path)
    mfile = "#{path}/#{MARSHAL_FILE}"
    return false unless (File.exist?(mfile))

    mstat = File.stat(mfile)
    DB::DB_TYPE.each {|type|
      dfile = "#{path}/#{DB::DB_FILE}#{type}.csv"
      dstat = File.stat(dfile)
      return false if (dstat.mtime - mstat.mtime > 0)
    }
    true
  end

  def save_db_marshal(file)
    File.open(file, "w") {|f|
      Marshal.dump(@db, f)
    }
  end

  def Suica::hex_dump(data)
    data.unpack("C*").map{|c| sprintf("%02X", c)}.join
  end

  def Suica::ary2csv(ary)
    l = ary.map {|d|
      if (d.kind_of?(Numeric))
        sprintf("%x", d)
      elsif (d.kind_of?(String))
        d = d.gsub('"', '""') if (d.index('"'))
        d = d.gsub(/.+/) {|m| %!"#{m}"!} if (d.index(',') || d.index('"'))
        d
      else
        d
      end
    }
    l.join(',')
  end
end
#require 'suica_mock'

class SuicaPlugin < Plugin
  [
   :COLUMN_CHECK,
   :COLUMN_TERMINAL,
   :COLUMN_TYPE,
   :COLUMN_CATEGORY,
   :COLUMN_CATEGORY_ID,
   :COLUMN_DATE,
   :COLUMN_TIME,
   :COLUMN_IN_LINE,
   :COLUMN_IN_STATION,
   :COLUMN_OUT_LINE,
   :COLUMN_OUT_STATION,
   :COLUMN_BALANCE,
   :COLUMN_EXPENSE,
   :COLUMN_ACCOUNT,
   :COLUMN_ACCOUNT_ID,
   :COLUMN_NUMBER,
   :COLUMN_REGION,
   :COLUMN_BINARY,
  ].each_with_index {|sym, i|
    const_set(sym, i)
  }

  GSUICA_PATH = "#{ENV['HOME']}/.gsuica"


class EditWindow < DialogWindow
  PADDING = 2

  def initialize(parent, raif_ui, suica)
    super(raif_ui, suica)
    parent = parent
    @suica_dialog = parent
    @vbox =Gtk::VBox.new
    @title = "Gsuica Edit"
    @suica = suica

    set_modal(true)
    set_transient_for(parent)

    signal_connect('key-press-event') {|w, e|
      case (e.keyval)
      when Gdk::Keyval::GDK_KEY_W, Gdk::Keyval::GDK_KEY_w
        hide if ((e.state & Gdk::Window::CONTROL_MASK).to_i != 0)
      end
    }

    init
    add(@vbox)
  end

  def init
    frame = Gtk::Frame.new
    vbox = Gtk::VBox.new

    @label = []
    @entry = []
    @id = []
    [
     [_('端末'), COLUMN_TERMINAL],
     [_('処理'), COLUMN_TYPE],
     [_('入線区'), COLUMN_IN_LINE],
     [_('入場駅'), COLUMN_IN_STATION],
     [_('出線区'), COLUMN_OUT_LINE],
     [_('出場駅'), COLUMN_OUT_STATION]
    ].each {|(title, col)|
      hbox = Gtk::HBox.new
      label = Gtk::Label.new(title+":")
      arrow = Gtk::Label.new("➔")

      id = Gtk::Entry.new
      id.width_chars = 8
      id.editable = false
      id.can_focus = false

      entry = Gtk::Entry.new
      entry.width_chars = 20
      entry.editable = true

      @id[col] = id
      @entry[col] = entry
      @label[col] = [label, arrow]

      hbox.pack_start(label, false, false, PADDING)
      hbox.pack_start(id, false, false, PADDING)
      hbox.pack_start(arrow, false, false, PADDING)
      hbox.pack_start(entry, true, true, PADDING)

      vbox.pack_start(hbox, true, true, PADDING)
    }
    frame.add(vbox)
    @vbox.pack_start(frame, true, true, PADDING)
    add_btns
  end

  def add_btns
    hbox = Gtk::HBox.new
    @ok_btn = Gtk::Button.new(Gtk::Stock::ADD)
    @cancel_btn = Gtk::Button.new(Gtk::Stock::CANCEL)

    @ok_btn.signal_connect("clicked") {|w|
      update_db
      @suica.save_user_db
      hide
    }

    @cancel_btn.signal_connect("clicked") {|w|
      hide
    }

    hbox.pack_end(@ok_btn, false, false, PADDING)
    hbox.pack_end(@cancel_btn, false, false, PADDING)
    @vbox.pack_start(hbox, false, false, PADDING)
  end

  def set_itr(col)
    @itr[col] = @entry[col].text if (@entry[col].sensitive?)
  end

  def update_db
    update_each_data(COLUMN_TERMINAL, @data.terminal)
    update_each_data(COLUMN_TYPE, @data.manage_type)
    update_each_data(COLUMN_IN_LINE, @data.in_line)
    update_each_data(COLUMN_IN_STATION, @data.in_station)
    update_each_data(COLUMN_OUT_LINE, @data.out_line)
    update_each_data(COLUMN_OUT_STATION, @data.out_station)
  end

  def update_each_data(i, data)
    if (@id[i] && data[0] && @entry[i].text != data[1] && data[1].length >= 0)
      case (i)
      when COLUMN_IN_LINE, COLUMN_IN_STATION
        @suica.update_db(@data,
                         @data.in_line[0],
                         @data.in_station[0],
                         @entry[COLUMN_IN_LINE].text,
                         @entry[COLUMN_IN_STATION].text)
      when COLUMN_OUT_LINE, COLUMN_OUT_STATION
        @suica.update_db(@data,
                         @data.out_line[0],
                         @data.out_station[0],
                         @entry[COLUMN_OUT_LINE].text,
                         @entry[COLUMN_OUT_STATION].text)
      when COLUMN_TERMINAL
        @suica.update_terminal(type, data[0], @entry[i].text)
      when  COLUMN_TYPE
        @suica.update_type(data[0], @entry[i].text)
      end
    end
  end

  def show(data)
    @data = data

    case data.terminal[0]
    when Suica::TYPE_SHOP, Suica::TYPE_VEND
      @label[COLUMN_IN_LINE][0].text = _("会社:")
      @label[COLUMN_IN_STATION][0].text = _("店舗:")
    else
      @label[COLUMN_IN_LINE][0].text = _("入線区:")
      @label[COLUMN_IN_STATION][0].text = _("入場駅:")
    end

    set_val(COLUMN_TERMINAL, data.terminal)
    set_val(COLUMN_TYPE, data.manage_type)
    set_val(COLUMN_IN_LINE, data.in_line)
    set_val(COLUMN_IN_STATION, data.in_station)
    set_val(COLUMN_OUT_LINE, data.out_line)
    set_val(COLUMN_OUT_STATION, data.out_station)

    super()
  end

  def set_val(i, val)
    if (@id[i])
      if (val[0].nil? || val[1].nil? || val[0] == 0)
        @id[i].sensitive = false
        @entry[i].sensitive = false
        @label[i][0].sensitive = false
        @label[i][1].sensitive = false
        @id[i].text = ""
        @entry[i].text = ""
      else
        @id[i].sensitive = true
        @entry[i].sensitive = true
        @label[i][0].sensitive = true
        @label[i][1].sensitive = true
        @id[i].text = sprintf("%02X", val[0])
        @entry[i].text = val[1]
      end
    end
  end
end

class InformationView < TreeView
  PAD = 2

  def initialize(parent, suica, clipboard, plugin)
    super(Gtk::TreeStore.new(TrueClass, String, String, String,
                             String, String, String, String,
                             String, String, String, String,
                             String, String, String, String,
                             String, Suica::Data))

    @parent = parent
    @clipboard = clipboard
    @suica = suica
    @plugin = plugin

    signal_connect('cursor-changed') {|w, arg1, arg2, data|
      itr = selection.selected
      path = itr.path.to_s if (itr)
      @parent.edit_btn.sensitive = if (itr.nil? || path == '0' || path == '1')
                                     false
                                   else
                                     true
                                   end
    }

    init
  end

  def init
    renderer_s = Gtk::CellRendererText.new
    renderer_n = Gtk::CellRendererText.new
    renderer_n.xalign = 1.0
    [
     [_('保存'),     COLUMN_CHECK,       nil,        :active, true],
     [_('端末'),     COLUMN_TERMINAL,    renderer_s, :text,   true],
     [_('処理'),     COLUMN_TYPE,        renderer_s, :text,   true],
     [_('分類'),     COLUMN_CATEGORY,    nil,        :text,   true],

     [_('分類番号'), COLUMN_CATEGORY_ID, renderer_n, :text,   false],
     [_('日付'),     COLUMN_DATE,        renderer_s, :text,   true],
     [_('時刻'),     COLUMN_TIME,        renderer_s, :text,   true],
     [_('入線区'),   COLUMN_IN_LINE,     renderer_s, :text,   true],

     [_('入場駅'),   COLUMN_IN_STATION,  renderer_s, :text,   true],
     [_('出線区'),   COLUMN_OUT_LINE,    renderer_s, :text,   true],
     [_('出場駅'),   COLUMN_OUT_STATION, renderer_s, :text,   true],
     [_('残高'),     COLUMN_BALANCE,     renderer_n, :text,   true],

     [_('支出'),     COLUMN_EXPENSE,     renderer_n, :text,   true],
     [_('口座'),     COLUMN_ACCOUNT,     nil,        :text,   true],
     [_('口座番号'), COLUMN_ACCOUNT_ID,  renderer_n, :text,   false],
     [_('連番'),     COLUMN_NUMBER,      renderer_n, :text,   false],

     [_('地域'),     COLUMN_REGION,      renderer_n, :text,   false],
    ].each {|(title, id, renderer, type, visible)|
      case id
      when COLUMN_CHECK
        renderer = Gtk::CellRendererToggle.new
        renderer.signal_connect('toggled') {|cell, path|
          iter = model.get_iter(Gtk::TreePath.new(path))
          if (path.to_s =~ /1:/)
            iter[id] = ! iter[id]
          end
        }
      when COLUMN_CATEGORY
        renderer = Gtk::CellRendererCombo.new
        model = @plugin.create_expense_category_tree_model
        renderer.model = model
        renderer.has_entry = false
        renderer.editable = true
        renderer.text_column = CategoryTreeModel::COLUMN_UNIFIED_NAME
        renderer.signal_connect('edited') {|cell, path, str|
          if (path.to_s != '0' && str)
            iter = self.model.get_iter(Gtk::TreePath.new(path))
            type = iter[COLUMN_BINARY].manage_type[0]
            if (type != 0 &&
                ! Suica::EXPENSE_CHARGE_ALL.index(type) &&
                ! Suica::EXPENSE_GIFT.index(type))
              c_id = cell.model.get_id_by_name(str)
              if (id)
                iter[COLUMN_CATEGORY] = str.split("\t")[0]
                iter[COLUMN_CATEGORY_ID] = c_id.to_s
              end
            end
          end
        }
      when COLUMN_TIME
        renderer = Gtk::CellRendererText.new
        renderer.editable = true
        renderer.signal_connect('edited') {|cell, path, str|
          if (path.to_s =~ /1:/)
            t = str.split(':')
            if (t.length == 2)
              h = t[0].to_i
              m = t[1].to_i
              if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
                iter = self.model.get_iter(Gtk::TreePath.new(path))
                iter[id] = sprintf('%02d:%02d', h, m)
              end
            end
          end
        }
      when COLUMN_ACCOUNT
        renderer = Gtk::CellRendererCombo.new
        model = @plugin.create_account_tree_model
        renderer.model = model
        renderer.has_entry = false
        renderer.editable = true
        renderer.text_column = AccountTreeModel::COLUMN_UNIFIED_NAME
        renderer.signal_connect('edited') {|cell, path, str|
          if (path.to_s != '0' && str)
            iter = self.model.get_iter(Gtk::TreePath.new(path))
            type = iter[COLUMN_BINARY].manage_type[0]
            if (Suica::EXPENSE_CHARGE_ALL.index(type))
              a_id = cell.model.get_id_by_name(str)
              if (id)
                iter[COLUMN_ACCOUNT] = str.split("\t")[0]
                iter[COLUMN_ACCOUNT_ID] = a_id.to_s
              end
            end
          end
        }
      else
      end
      column = Gtk::TreeViewColumn.new(title, renderer, type => id)
      column.clickable = false
      column.resizable = true
      column.visible = visible
      append_column(column)
    }
    column = Gtk::TreeViewColumn.new('', renderer_s)
    column.visible = false
    append_column(column)

    clear

    @popup_menu = PopupMenu.new
    @popup_menu.register_event {|w|
      itr = selection.selected
      if (itr)
        @parent.show_edit_window(itr[COLUMN_BINARY])
      end
    }

    @popup_menu.copy_event {|w|
      itr = selection.selected
      @clipboard.text = (0..COLUMN_BINARY).map {|i|
        itr[i].to_s
      }.join(',')
    }

    signal_connect('button-press-event') {|w, e|
      if e.kind_of? Gdk::EventButton
        itr = selection.selected
        if (itr && itr.parent && e.button == 3)
          @popup_menu.popup(itr, @clipboard, e.button, e.time)
        end
      end
    }

    set_size_request(480, 200)
    selection.mode = Gtk::SELECTION_SINGLE
  end

  def selected
    selection.selected
  end

  def update_data
    _update_data(@in_out)
    _update_data(@history)
    update
  end

  def _update_data(iter)
    n = iter.n_children
    (0...n).each {|j|
      row = iter.nth_child(j)
      a = @suica.parse_data(row[COLUMN_BINARY])
      a.each_with_index {|s, i|
        row[i] = s
      }
    }
  end

  def update
    expand_all
    n = @history.n_children
    row = @history.nth_child(n - 1)
    balance = row[COLUMN_BALANCE].to_i
    (0...n - 1).each {|i|
      row = @history.nth_child(n - 2 - i)
      b = row[COLUMN_BALANCE].to_i
      row[COLUMN_EXPENSE] = (balance - b).to_s
      balance = b
    }
    @history.nth_child(n - 1)[COLUMN_CHECK] = false
  end

  def append_in_out(data)
    row = model.append(@in_out)
    set_data(row, data)
  end

  def append_history(data, last_id)
    return if (data.number[0] < 1)
    row = model.append(@history)
    set_data(row, data)

    row[COLUMN_TIME] = @parent.default_time if (row[COLUMN_TIME].length < 1)
    case data.manage_type[0]
    when *Suica::EXPENSE_TRAIN_ALL
      row[COLUMN_CATEGORY] = @parent.get_category_by_id(@parent.train_category).to_s
      row[COLUMN_CATEGORY_ID] = @parent.train_category.to_s
    when *Suica::EXPENSE_BUS
      row[COLUMN_CATEGORY] = @parent.get_category_by_id(@parent.bus_category).to_s
      row[COLUMN_CATEGORY_ID] = @parent.bus_category.to_s
    when *Suica::EXPENSE_SHOP
      row[COLUMN_CATEGORY] = @parent.get_category_by_id(@parent.shop_category).to_s
      row[COLUMN_CATEGORY_ID] = @parent.shop_category.to_s
    when *Suica::EXPENSE_CHARGE
      row[COLUMN_ACCOUNT] = @parent.get_account_by_id(@parent.charge_account).to_s
      row[COLUMN_ACCOUNT_ID] = @parent.charge_account.to_s
    when *Suica::EXPENSE_ACHARGE
      @parent.autocharge_account # Fix me: Why call autocharge_account twice?
      val = @parent.autocharge_account # Fix me: Why call autocharge_account twice?
      row[COLUMN_ACCOUNT] = @parent.get_account_by_id(val).to_s
      row[COLUMN_ACCOUNT_ID] = @parent.autocharge_account.to_s
    when *Suica::EXPENSE_GIFT
      row[COLUMN_CATEGORY] = @parent.get_category_by_id(@parent.gift_category).to_s
      row[COLUMN_CATEGORY_ID] = @parent.gift_category.to_s
    end
    row[COLUMN_CHECK] = (data.number[0] > last_id)
  end

  def set_data(row, data)
    row[COLUMN_TERMINAL] = data.terminal[1]
    row[COLUMN_TYPE] = data.manage_type[1]
    row[COLUMN_DATE] = data.date[1]
    row[COLUMN_TIME] = data.time[1]
    row[COLUMN_IN_LINE] = data.in_line[1]
    row[COLUMN_IN_STATION] = data.in_station[1]
    row[COLUMN_OUT_LINE] = data.out_line[1]
    row[COLUMN_OUT_STATION] = data.out_station[1]
    row[COLUMN_BALANCE] = data.balance[1]
    row[COLUMN_EXPENSE] = data.expense[1]
    row[COLUMN_NUMBER] = data.number[1]
    row[COLUMN_REGION] = data.region[1]
    row[COLUMN_BINARY] = data
  end

  def clear
    model.clear

    @in_out = model.append(nil)
    @in_out[COLUMN_TERMINAL] = _("入出場記録")
    @in_out[COLUMN_TYPE] = ""
    @in_out[COLUMN_DATE] = ""
    @in_out[COLUMN_TIME] = ""
    @in_out[COLUMN_IN_LINE] = ""
    @in_out[COLUMN_IN_STATION] = ""
    @in_out[COLUMN_OUT_LINE] = ""
    @in_out[COLUMN_OUT_STATION] = ""
    @in_out[COLUMN_BALANCE] = ""
    @in_out[COLUMN_EXPENSE] = ""

    @history = model.append(nil)
    @history[COLUMN_TERMINAL] = _("履歴")
    @history[COLUMN_TYPE] = ""
    @history[COLUMN_DATE] = ""
    @history[COLUMN_TIME] = ""
    @history[COLUMN_IN_LINE] = ""
    @history[COLUMN_IN_STATION] = ""
    @history[COLUMN_OUT_LINE] = ""
    @history[COLUMN_OUT_STATION] = ""
    @history[COLUMN_BALANCE] = ""
    @history[COLUMN_EXPENSE] = ""
  end

  def each(&block)
    n = @history.n_children
    (0...n).each {|i|
      yield(@history.nth_child(i))
    }
  end

end

class SuicaSetupWindow < DialogWindow
  SHOP_REGION_VAL = [
    ["Suica/PASMO", 1],
    ["ICOCA", 2],
    ["IruCa", 4],
  ]

  attr_reader :modified

  def initialize(parent, plugin, suica)
    super(parent.parent, nil)
    self.modal = true
    self.transient_for = parent

    @parent_dialog = parent

    @plugin = plugin
    @suica = suica

    @felica_id = @suica.idm

    vbox = Gtk::VBox.new

    hbox = create_panel
    vbox.pack_start(hbox)
    vbox.pack_end(create_root_btns, false, false, 4)

    self.title = "Suica setup"
    add(vbox)

    signal_connect('delete-event') {|w, e|
      w.cancel
      w.signal_emit_stop('delete-event')
    }
  end

  def ok
    @parent_dialog.conf_quit = @conf_quit.active?
    @parent_dialog.show_detail = @show_detail.active?
    @parent_dialog.train_category = @train_category.active
    @parent_dialog.bus_category = @bus_category.active
    @parent_dialog.shop_category = @shop_category.active
    @parent_dialog.suica_account = @suica_account.active
    @parent_dialog.charge_account = @charge_account.active
    @parent_dialog.autocharge_account =  @autocharge_account.active
    @parent_dialog.gift_category = @gift_category.active
    @parent_dialog.default_time =  @default_time.to_s
    shop_region = SHOP_REGION_VAL[@shop_region.active]
    @parent_dialog.shop_region = shop_region[1] if (shop_region)
    hide
  end

  def cancel
    hide
  end

  def show
    super

    @conf_quit.active = @parent_dialog.conf_quit
    @show_detail.active = @parent_dialog.show_detail
    @train_category.active = @parent_dialog.train_category
    @bus_category.active = @parent_dialog.bus_category
    @shop_category.active = @parent_dialog.shop_category
    @suica_account.active = @parent_dialog.suica_account
    @charge_account.active = @parent_dialog.charge_account
    @autocharge_account.active = @parent_dialog.autocharge_account
    @gift_category.active = @parent_dialog.gift_category
    @default_time.set(@parent_dialog.default_time)

    shop_region = @parent_dialog.shop_region
    index = 0
    SHOP_REGION_VAL.each_with_index {|v, i|
      index = i if (v[1] == shop_region)
    }
    @shop_region.active = index
  end

  def hide
    super
  end

  private

  def add_option(vbox, lable_str, *widget)
    hbox = Gtk::HBox.new
    hbox.pack_start(MyLabel.new(lable_str), false, false, 0) if (lable_str)
    widget.each {|w|
      if (w.instance_of?(Gtk::Entry))
        hbox.pack_start(w, true, true, 4)
      else
        hbox.pack_start(w, false, false, 4)
      end
    }
    vbox.pack_start(hbox, false, false, 10)
  end

  def create_panel
    hbox = Gtk::HBox.new(true, 1)
    vbox = Gtk::VBox.new

    @conf_quit = Gtk::CheckButton.new(_("終了時に確認する"))
    add_option(vbox, nil, @conf_quit)

    @show_detail = Gtk::CheckButton.new(_("詳細を表示する"))
    add_option(vbox, nil, @show_detail)

    @train_category = CategoryComboBox.new(Zaif_category::EXPENSE)
    add_option(vbox, '運賃支払の分類：', @train_category)

    @bus_category = CategoryComboBox.new(Zaif_category::EXPENSE)
    add_option(vbox, 'バス支払の分類：', @bus_category)

    @shop_category = CategoryComboBox.new(Zaif_category::EXPENSE)
    add_option(vbox, '物販支払の分類：', @shop_category)

    @suica_account = AccountComboBox.new
    add_option(vbox, 'カードのアカウント：', @suica_account)

    @charge_account = AccountComboBox.new
    add_option(vbox, 'チャージのアカウント：', @charge_account)

    @autocharge_account = AccountComboBox.new
    add_option(vbox, 'オートチャージのアカウント：', @autocharge_account)

    @gift_category = CategoryComboBox.new(Zaif_category::INCOME)
    add_option(vbox, '特典チャージの分類：', @gift_category)

    @default_time = TimeInput.new
    add_option(vbox, '時刻の初期値：', @default_time)

    @shop_region = Gtk::ComboBox.new
    SHOP_REGION_VAL.each {|k|
      @shop_region.append_text(k[0])
    }
    add_option(vbox, "店舗エリア:", @shop_region)

    hbox.pack_start(Gtk::Frame.new.add(vbox))

    hbox
  end

  def create_root_btns
    create_btns([
                  [:@setup_ok_btn, Gtk::Stock::OK, :ok, :pack_end],
                  [:@setup_cancel_btn, Gtk::Stock::CANCEL, :cancel, :pack_end]
                ], 10)
  end

  def create_btns(data, pad = 0)
    hbox = Gtk::HBox.new

    data.each {|b|
      btn = Gtk::Button.new(b[1])
      btn.signal_connect("clicked") {|w|
        send(b[2])
      }
      hbox.send(b[3], btn, false, false, pad)
      instance_variable_set(b[0], btn)
    }

    hbox
  end

end


  class PopupMenu < Gtk::Menu
    def initialize
      super
      @register = Gtk::ImageMenuItem.new(Gtk::Stock::EDIT)
      @copy = Gtk::ImageMenuItem.new(Gtk::Stock::COPY)

      append(@register)
      append(@copy)
      self.show_all
    end

    def copy_event(&block)
      @copy.signal_connect("activate") {|w|
        yield(w)
      }
    end

    def register_event(&block)
      @register.signal_connect("activate") {|w|
        yield(w)
      }
    end

    def popup(iter, clipboard, button, time)
      @register.sensitive = ! iter.nil?
      @copy.sensitive = ! iter.nil?

      super(nil, nil, button, time)
    end
  end

  class SuicaDialog < DialogWindow
    attr_reader :parent, :edit_btn

    [
     ['conf_quit',          true,    false, "B"],
     ['show_detail',        true,    false, "B"],
     ['train_category',     10001,   true,  "I"],
     ['bus_category',       10001,   true,  "I"],
     ['shop_category',      10001,   true,  "I"],
     ['gift_category',      10001,   true,  "I"],
     ['suica_account',      10001,   true,  "I"],
     ['charge_account',     10001,   true,  "I"],
     ['autocharge_account', 10001,   true,  "I"],
     ['default_time',       "12:00", true,  "S"],
     ['shop_region',        1,       true,  "I"],
    ].each {|(name, val, individual, type)|
      if (individual)
        define_method(name) {
          path = name
          path = "#{@idm}/" + path if (@idm)
          case type
          when "B"
            @plugin.get_conf(path, val) == "true"
          when "I"
            @plugin.get_conf(path, val).to_i
          when "S"
            @plugin.get_conf(path, val).to_s
          end
        }
        define_method(name + '=') {|arg|
          path = name
          path = "#{@idm}/" + path if (@idm)
          @plugin.save_conf(path, arg)
        }
      else
        define_method(name) {
          case type
          when "B"
            @plugin.get_conf(path, val) == "true"
          when "I"
            @plugin.get_conf(path, val).to_i
          when "S"
            @plugin.get_conf(path, val).to_s
          end
        }
        define_method(name + '=') {|arg|
          @plugin.save_conf(name, arg)
        }
      end
    }

    def initialize(parent, data, plugin)
      super(parent, data)
      @vbox =Gtk::VBox.new
      @plugin = plugin

      @suica = Suica.new("#{GSUICA_PATH}/station_code")

      signal_connect('key-press-event') {|w, e|
        case (e.keyval)
        when Gdk::Keyval::GDK_KEY_W, Gdk::Keyval::GDK_KEY_w
          hide if ((e.state & Gdk::Window::CONTROL_MASK).to_i != 0)
        end
      }

      setup(@vbox)
      add(@vbox)
    end

    def show
      super
      @tree_view.clear
    end

    def get_category_by_id(id)
      @zaif_data.get_category_by_id(id, false, false)
    end

    def get_account_by_id(id)
      @zaif_data.get_account_by_id(id)
    end

    def set_shop_region
      shop_region = get_gconf('/general/shop_region')
      @suica.shop_region = shop_region.to_i if (shop_region)
    end

    def setup(vbox)
      @toolbar = create_toolbar
      vbox.pack_start(@toolbar, false, false)

      @clipboard = self.get_clipboard(Gdk::Atom.new(0))
      @tree_view = InformationView.new(self, @suica, @clipboard, @plugin)

      scrolled_window = Gtk::ScrolledWindow.new
      scrolled_window.hscrollbar_policy = Gtk::POLICY_AUTOMATIC
      scrolled_window.vscrollbar_policy = Gtk::POLICY_AUTOMATIC
      scrolled_window.add(@tree_view)

      vbox.pack_start(scrolled_window, true, true)
      vbox.pack_start(create_buttons, false, false)
    end

    def create_buttons
      hbox = Gtk::HBox.new(false, 10)

      @ok_btn = Gtk::Button.new(Gtk::Stock::SAVE)
      @ok_btn.signal_connect("clicked") {|w|
        last_id = get_last_number
        @tree_view.each {|item|
          last_id = [save_item(item), last_id].max
        }
        set_last_number(last_id)
        @plugin.update_summary
        hide
      }

      @cancel_btn = Gtk::Button.new(Gtk::Stock::CANCEL)
      @cancel_btn.signal_connect("clicked") {|w|
        hide
      }

      hbox.pack_end(@ok_btn, false, false)
      hbox.pack_end(@cancel_btn, false, false)

      hbox
    end

    def create_toolbar
      toolbar = Gtk::Toolbar.new
      @connect_btn = Gtk::ToolButton.new(Gtk::Stock::REFRESH)
      @connect_btn.signal_connect('clicked') {|w|
        read_suica
      }
      @edit_btn = Gtk::ToolButton.new(Gtk::Stock::EDIT)
      @edit_btn.signal_connect('clicked') {|w|
        itr = @tree_view.selected
        show_edit_window(itr[COLUMN_BINARY]) if (itr)
      }
      @edit_btn.sensitive = false
      @preferences_btn = Gtk::ToolButton.new(Gtk::Stock::PREFERENCES)
      @preferences_btn.signal_connect('clicked') {|w|
        @setupwin = SuicaSetupWindow.new(self, @plugin, @suica) unless (@setupwin)
        @setupwin.show
      }

      toolbar.insert(-1, @connect_btn)
      toolbar.insert(-1, @edit_btn)
      toolbar.insert(-1, @preferences_btn)

      toolbar
    end

    def read_suica
      begin
        @suica.get_data
        @idm = Suica::hex_dump(@suica.idm)
        update
      rescue => ever
        @plugin.err_message("データの読込に失敗しました。\n#{ever.to_s}", self)
      end
    end

    def update
      @tree_view.clear
      last_id = get_last_number
      @suica.in_out.each {|l|
        @tree_view.append_in_out(l)
      }

      @suica.history.each {|l|
        @tree_view.append_history(l, last_id)
      }
      @tree_view.update
    end

    def get_last_number
      @plugin.get_conf("#{@idm}/last_number", 0).to_i
    end

    def set_last_number(num)
      @plugin.save_conf("#{@idm}/last_number", num)
    end

    def save_item(item)
      n = item[COLUMN_NUMBER].to_i
      return n if (item[COLUMN_EXPENSE].nil? || ! item[COLUMN_CHECK])

      account = suica_account
      y, m, d = item[COLUMN_DATE].split('/').map {|s| s.to_i}
      if (item[COLUMN_EXPENSE].length < 1)
        zitem = Zaif_item.new(Zaif_item::TYPE_ADJUST,
                              account,
                              item[COLUMN_TIME],
                              item[COLUMN_BALANCE].to_i,
                              nil,
                              item[COLUMN_TYPE],
                              nil, nil, nil, false)
      else
        amount = item[COLUMN_EXPENSE].to_i
        case item[COLUMN_BINARY].manage_type[0]
        when *Suica::EXPENSE_TRAIN_MISC
          zitem = Zaif_item.new(Zaif_item::TYPE_EXPENSE,
                                account,
                                item[COLUMN_TIME],
                                amount,
                                item[COLUMN_CATEGORY_ID].to_i,
                                "#{item[COLUMN_TYPE]}(#{item[COLUMN_IN_STATION]})")
        when *Suica::EXPENSE_TRAIN
          zitem = Zaif_item.new(Zaif_item::TYPE_EXPENSE,
                                account,
                                item[COLUMN_TIME],
                                amount,
                                item[COLUMN_CATEGORY_ID].to_i,
                                "#{item[COLUMN_IN_STATION]}->#{item[COLUMN_OUT_STATION]}")
        when *[Suica::EXPENSE_BUS, Suica::EXPENSE_SHOP].flatten
          zitem = Zaif_item.new(Zaif_item::TYPE_EXPENSE,
                                account,
                                item[COLUMN_TIME],
                                amount,
                                item[COLUMN_CATEGORY_ID].to_i,
                                "#{item[COLUMN_IN_LINE]} #{item[COLUMN_IN_STATION]}")
        when *Suica::EXPENSE_CHARGE_ALL
          zitem = Zaif_item.new(Zaif_item::TYPE_MOVE,
                                item[COLUMN_ACCOUNT_ID].to_i,
                                item[COLUMN_TIME],
                                amount * -1,
                                nil,
                                "#{item[COLUMN_TYPE]} (#{item[COLUMN_IN_STATION]})",
                                account,
                                0,
                                -1)
        when *Suica::EXPENSE_GIFT
          zitem = Zaif_item.new(Zaif_item::TYPE_INCOME,
                                account,
                                item[COLUMN_TIME],
                                -amount,
                                item[COLUMN_CATEGORY_ID].to_i,
                                "#{item[COLUMN_TYPE]} (#{item[COLUMN_IN_STATION]})",
                                account,
                                0,
                                -1)
        end
      end
      @plugin.add_new_item(y, m, d, zitem)
      n
    end

    def show_edit_window(data)
      @edit_window = EditWindow.new(self, @parent, @suica) unless (@edit_window)
      @edit_window.show(data)
    end
  end

  def main(d)
    unless (@dialog)
      @dialog = SuicaDialog.new(@@parent, @@zaif_data, self)
      @dialog.modal = true
    end
    @dialog.show
  end
end

SuicaPlugin.new("suica", "_Suica ...")
rescue LoadError
end
