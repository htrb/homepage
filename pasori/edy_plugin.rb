# -*- coding: utf-8 -*-
# $Id: ui.rb,v 1.4 2008-02-04 08:43:11 hito Exp $

begin
require "pasori"

class Edy

  attr_reader :idm

  TYPE_CHARGE,
  TYPE_EDY_GIFT,
  TYPE_EXPENSE = [0x02, 0x04, 0x20]

  Type = {
    TYPE_CHARGE => "チャージ",
    TYPE_EDY_GIFT => "Edyギフト",
    TYPE_EXPENSE => "出金",
  }

  class History

    [
     :ID_TYPE,
     :ID_MISC,
     :ID_COUNT,
     :ID_DATE,
     :ID_EXPENSE,
     :ID_BALANCE,
    ].each_with_index {|sym, i|
      const_set(sym, i)
    }

    Epoch = Time.local(2000, 1, 1)

    attr_reader :data, :type, :date, :balance, :count

    def initialize(data)
      @data = data
      a = data.unpack('CCnNNN')
      @type = a[ID_TYPE]
      @date = Epoch + (a[ID_DATE] >> 17) * 86400 + (a[ID_DATE] & 0x1ffff)
      @expense = a[ID_EXPENSE]
      @balance = a[ID_BALANCE]
      @count = a[ID_COUNT]
    end

    def expense
      case (@type)
      when TYPE_EXPENSE
        @expense
      when TYPE_EDY_GIFT, TYPE_CHARGE
        nil
      else
        @else
      end
    end

    def charge
      case (@type)
      when TYPE_EXPENSE
        nil
      when TYPE_EDY_GIFT, TYPE_CHARGE
        @expense
      end
    end

    def type_str
      t = Type[@type]
      t = sprintf("不明 (0x%02x)", @type) unless (t)
      t
    end
  end

  def initialize
    @history = []
  end

  def get_data
    @pasori = Pasori.open {|pasori|
      pasori.felica_polling(Felica::POLLING_EDY) {|felica|
        id = felica.read(Felica::SERVICE_EDY_NUMBER, 0)
        raise "cannnot open Edy." unless (id)
        @id = id.unpack("nnnnnnnn")
        @idm = felica.idm

        @history.clear
        felica.foreach(Felica::SERVICE_EDY_HISTORY) {|l|
          h = History.new(l)
          break if (h.type == 0 &&
                    h.date == History::Epoch &&
                    h.charge.to_i == 0 &&
                    h.expense.to_i == 0)
          @history.push(h)
        }
      }
    }
    @history
  end

  def id
    @id[1..4]
  end

  def each(&block)
    @history.each{|h|
      yield(h)
    }
  end
end
#require 'edy_mock'

class EdyPlugin < Plugin

  [
   :COLUMN_CHECK,
   :COLUMN_DATE,
   :COLUMN_TIME,
   :COLUMN_CHARGE,
   :COLUMN_GIFT_CATEGORY,
   :COLUMN_GIFT_CATEGORY_ID,
   :COLUMN_EXPENCE,
   :COLUMN_CATEGORY,
   :COLUMN_CATEGORY_ID,
   :COLUMN_BALANCE,
   :COLUMN_ACCOUNT,
   :COLUMN_ACCOUNT_ID,
   :COLUMN_TYPE,
   :COLUMN_TYPE_ID,
   :COLUMN_NUMBER,
   :COLUMN_BINARY,
  ].each_with_index {|sym, i|
    const_set(sym, i)
  }


class InformationView < TreeView
  PAD = 2

  def initialize(parent, edy, clipboard, plugin)
    super(Gtk::ListStore.new(TrueClass,
                             String,  String,
                             Integer,
                             String,  Integer,
                             Integer,
                             String,  Integer,
                             Integer,
                             String,  Integer,
                             String,  Integer,
                             Integer,
                             String))

    @parent = parent
    @clipboard = clipboard
    @edy = edy
    @plugin = plugin

    signal_connect('cursor-changed') {|w, arg1, arg2, data|
      itr = selection.selected
      path = itr.path.to_s if (itr)
    }

    init
  end

  def init
    renderer_s = Gtk::CellRendererText.new
    renderer_n = Gtk::CellRendererText.new
    renderer_n.xalign = 1.0
    [
     [_('保存'),       COLUMN_CHECK,            nil,        :active, true],
     [_('日付'),       COLUMN_DATE,             renderer_s, :text,   true],
     [_('時刻'),       COLUMN_TIME,             renderer_s, :text,   true],
     [_('チャージ'),   COLUMN_CHARGE,           renderer_n, :text,   true],
     [_('ギフト分類'), COLUMN_GIFT_CATEGORY,    nil,        :text,   true],
     [_('ギフト番号'), COLUMN_GIFT_CATEGORY_ID, renderer_n, :text,   false],
     [_('支出'),       COLUMN_EXPENCE,          renderer_n, :text,   true],
     [_('支出分類'),   COLUMN_CATEGORY,         nil,        :text,   true],
     [_('支出番号'),   COLUMN_CATEGORY_ID,      renderer_n, :text,   false],
     [_('残高'),       COLUMN_BALANCE,          renderer_n, :text,   true],
     [_('口座'),       COLUMN_ACCOUNT,          nil,        :text,   true],
     [_('口座番号'),   COLUMN_ACCOUNT_ID,       renderer_n, :text,   false],
     [_('備考'),       COLUMN_TYPE,             nil,        :text,   true],
     [_('TYPE'),       COLUMN_TYPE_ID,          renderer_s, :text,   false],
     [_('連番'),       COLUMN_NUMBER,           renderer_n, :text,   false],
     ['binary',        COLUMN_BINARY,           renderer_n, :text,   false],
    ].each {|(title, id, renderer, type, visible)|
      case id
      when COLUMN_CHECK
        renderer = Gtk::CellRendererToggle.new
        renderer.signal_connect('toggled') {|cell, path|
          iter = model.get_iter(Gtk::TreePath.new(path))
          iter[id] = ! iter[id]
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
            type = iter[COLUMN_TYPE_ID]
            if (type == Edy::TYPE_EXPENSE)
              c_id = cell.model.get_id_by_name(str)
              if (id)
                iter[COLUMN_CATEGORY] = str.split("\t")[0]
                iter[COLUMN_CATEGORY_ID] = c_id
              end
            end
          end
        }
      when COLUMN_GIFT_CATEGORY
        renderer = Gtk::CellRendererCombo.new
        model = @plugin.create_income_category_tree_model
        renderer.model = model
        renderer.has_entry = false
        renderer.editable = true
        renderer.text_column = CategoryTreeModel::COLUMN_UNIFIED_NAME
        renderer.signal_connect('edited') {|cell, path, str|
          if (path.to_s != '0' && str)
            iter = self.model.get_iter(Gtk::TreePath.new(path))
            type = iter[COLUMN_TYPE_ID]
            if (type == Edy::TYPE_EDY_GIFT)
              c_id = cell.model.get_id_by_name(str)
              if (id)
                iter[COLUMN_GIFT_CATEGORY] = str.split("\t")[0]
                iter[COLUMN_GIFT_CATEGORY_ID] = c_id
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
            type = iter[COLUMN_TYPE_ID]
            if (type == Edy::TYPE_CHARGE)
              a_id = cell.model.get_id_by_name(str)
              if (id)
                iter[COLUMN_ACCOUNT] = str.split("\t")[0]
                iter[COLUMN_ACCOUNT_ID] = a_id
              end
            end
          end
        }
      when COLUMN_TYPE
        renderer = Gtk::CellRendererText.new
        renderer.editable = true
        renderer.signal_connect('edited') {|cell, path, str|
          iter = self.model.get_iter(Gtk::TreePath.new(path))
          iter[COLUMN_TYPE] = str
        }
      else
      end
      column = Gtk::TreeViewColumn.new(title, renderer, type => id)
      column.clickable = false
      column.resizable = true
      column.visible = visible
      append_column(column)
    }

    clear

    @popup_menu = PopupMenu.new
    @popup_menu.copy_event {|w|
      itr = selection.selected
      @clipboard.text = csv(iter)
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

  def csv(iter)
    a = (0..COLUMN_BINARY).map {|j|
      iter[j]
    }
    EdyPlugin::ary2csv(a)
  end

  def selected
    selection.selected
  end

  def append_history(data, last_id)
    row = model.append
    row[COLUMN_NUMBER] = data.count
    row[COLUMN_DATE] = data.date.strftime('%Y/%m/%d')
    row[COLUMN_TIME] = data.date.strftime('%H:%M')
    row[COLUMN_CHARGE] = data.charge.to_i
    row[COLUMN_EXPENCE] =  data.expense.to_i
    row[COLUMN_BALANCE] = data.balance
    row[COLUMN_TYPE] = (data.type == Edy::TYPE_EDY_GIFT) ? data.type_str : ""
    row[COLUMN_TYPE_ID] = data.type
    row[COLUMN_BINARY] = data.data.unpack("C*").map{|c| sprintf("%02X", c)}.join

    case data.type
    when Edy::TYPE_EXPENSE
      row[COLUMN_CATEGORY] = @parent.get_category_by_id(@parent.expense_category).to_s
      row[COLUMN_CATEGORY_ID] = @parent.expense_category
    when Edy::TYPE_EDY_GIFT
      row[COLUMN_GIFT_CATEGORY] = @parent.get_category_by_id(@parent.gift_category).to_s
      row[COLUMN_GIFT_CATEGORY_ID] = @parent.gift_category
    when Edy::TYPE_CHARGE
      @parent.charge_account # Fix me: Why call autocharge_account twice?
      val = @parent.charge_account # Fix me: Why call autocharge_account twice?
      row[COLUMN_ACCOUNT] = @parent.get_account_by_id(val).to_s
      row[COLUMN_ACCOUNT_ID] = @parent.charge_account
    end
    row[COLUMN_CHECK] = (data.count > last_id)
  end

  def clear
    model.clear
  end

  def each(&block)
    model.each {|model, path, iter|
      yield(iter)
    }
  end
end

class EdySetupWindow < DialogWindow
  attr_reader :modified

  def initialize(parent, plugin, edy)
    super(parent.parent, nil)
    self.modal = true
    self.transient_for = parent

    @parent_dialog = parent

    @plugin = plugin
    @edy = edy

    @felica_id = @edy.idm

    vbox = Gtk::VBox.new

    hbox = create_panel
    vbox.pack_start(hbox)
    vbox.pack_end(create_root_btns, false, false, 4)

    self.title = "Edy setup"
    add(vbox)

    signal_connect('delete-event') {|w, e|
      w.cancel
      w.signal_emit_stop('delete-event')
    }
  end

  def ok
    @parent_dialog.conf_quit = @conf_quit.active?
    @parent_dialog.expense_category = @expense_category.active
    @parent_dialog.gift_category = @gift_category.active
    @parent_dialog.edy_account = @edy_account.active
    @parent_dialog.charge_account = @charge_account.active
    hide
  end

  def cancel
    hide
  end

  def show
    super

    @conf_quit.active = @parent_dialog.conf_quit
    @expense_category.active = @parent_dialog.expense_category
    @gift_category.active = @parent_dialog.gift_category
    @edy_account.active = @parent_dialog.edy_account
    @charge_account.active = @parent_dialog.charge_account
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

    @expense_category = CategoryComboBox.new(Zaif_category::EXPENSE)
    add_option(vbox, '支払の分類：', @expense_category)

    @gift_category = CategoryComboBox.new(Zaif_category::INCOME)
    add_option(vbox, 'ギフトの分類：', @gift_category)

    @edy_account = AccountComboBox.new
    add_option(vbox, 'カードのアカウント：', @edy_account)

    @charge_account = AccountComboBox.new
    add_option(vbox, 'チャージのアカウント：', @charge_account)

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

    def popup(iter, clipboard, button, time)
      @register.sensitive = ! iter.nil?
      @copy.sensitive = ! iter.nil?

      super(nil, nil, button, time)
    end
  end

  class EdyDialog < DialogWindow
    attr_reader :parent, :edit_btn

    [
     ['conf_quit',        true,  false, "B"],
     ['expense_category', 10001, true,  "I"],
     ['gift_category',    10001, true,  "I"],
     ['edy_account',      10001, true,  "I"],
     ['charge_account',   10001, true,  "I"],
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
            @plugin.get_conf(name, val) == "true"
          when "I"
            @plugin.get_conf(name, val).to_i
          when "S"
            @plugin.get_conf(name, val).to_s
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

      @edy = Edy.new

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

    def setup(vbox)
      @toolbar = create_toolbar
      vbox.pack_start(@toolbar, false, false)

      @clipboard = self.get_clipboard(Gdk::Atom.new(0))
      @tree_view = InformationView.new(self, @edy, @clipboard, @plugin)

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
        read_edy
      }
      @preferences_btn = Gtk::ToolButton.new(Gtk::Stock::PREFERENCES)
      @preferences_btn.signal_connect('clicked') {|w|
        @setupwin = EdySetupWindow.new(self, @plugin, @edy) unless (@setupwin)
        @setupwin.show
      }

      toolbar.append(@connect_btn)
      toolbar.append(@preferences_btn)

      toolbar
    end

    def read_edy
      @tree_view.clear
      begin
        @edy.get_data
        @idm = EdyPlugin::hex_dump(@edy.idm)
        last_id = get_last_number
        @edy.each {|l|
          @tree_view.append_history(l, last_id)
        }
      rescue => ever
        @plugin.err_message("データの読込に失敗しました。\n#{ever.to_s.toutf8}")
      end
    end

    def get_last_number
      @plugin.get_conf("#{@idm}/last_number", 0).to_i
    end

    def set_last_number(num)
      @plugin.save_conf("#{@idm}/last_number", num)
    end

    def save_item(item)
      n = item[COLUMN_NUMBER].to_i
      return n if (item[COLUMN_EXPENCE].nil? || ! item[COLUMN_CHECK])

      account = edy_account
      y, m, d = item[COLUMN_DATE].split('/').map {|s| s.to_i}
      case item[COLUMN_TYPE_ID]
      when Edy::TYPE_CHARGE
        zitem = Zaif_item.new(Zaif_item::TYPE_MOVE,
                              item[COLUMN_ACCOUNT_ID],
                              item[COLUMN_TIME],
                              item[COLUMN_CHARGE],
                              nil,
                              item[COLUMN_TYPE],
                              account,
                              0,
                              -1)
      when Edy::TYPE_EDY_GIFT
        zitem = Zaif_item.new(Zaif_item::TYPE_INCOME,
                              account,
                              item[COLUMN_TIME],
                              item[COLUMN_CHARGE],
                              item[COLUMN_CATEGORY_ID],
                              item[COLUMN_TYPE])
      when Edy::TYPE_EXPENSE
        zitem = Zaif_item.new(Zaif_item::TYPE_EXPENSE,
                              account,
                              item[COLUMN_TIME],
                              item[COLUMN_EXPENCE],
                              item[COLUMN_CATEGORY_ID],
                              item[COLUMN_TYPE])
      end
      @plugin.add_new_item(y, m, d, zitem)
      n
    end
  end

  def main(d)
    unless (@dialog)
      @dialog = EdyDialog.new(@@parent, @@zaif_data, self)
      @dialog.modal = true
    end
    @dialog.show
  end

  def EdyPlugin::ary2csv(ary)
    l = ary.map {|d|
      if (d.kind_of?(Numeric))
        sprintf("%d", d)
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

  def EdyPlugin::hex_dump(data)
    data.unpack("C*").map{|c| sprintf("%02X", c)}.join
  end
end

EdyPlugin.new("edy", "_Edy ...")
rescue LoadError
end
