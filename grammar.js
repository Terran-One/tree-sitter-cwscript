const _o = (x) => optional(x);
const csl = (rule) => seq(rule, repeat(seq(",", rule)));
const block = (kw, item_rule) => seq(kw, "{", repeat(item_rule), "}");
const _ = (...x) => {
  return seq(...x);
};
const _or = (...x) => choice(...x);

const spec = ($) => field("spec", optional($.cwspec));

module.exports = grammar({
  name: "cwscript",

  extras: ($) => [/\s/, $.comment],
  word: ($) => $.ident,
  inline: ($) => [$.enum_variant],
  supertypes: ($) => [
    $.stmt,
    $.expr,
    $.val,
    $.type_expr,
    $.contract_item,
    $.interface_item,
  ],

  rules: {
    cwscript_src: ($) => repeat($._cws_item),
    _cws_item: ($) => choice($.contract_defn, $.interface_defn, $._import_stmt),

    /** IGNOREABLE */
    comment: ($) =>
      token(
        choice(seq("//", /.*/), seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"))
      ),
    /** IGNOREABLE */

    cwspec: ($) => repeat1($.cwspec_comment),
    cwspec_comment: ($) =>
      token(
        choice(
          seq("///", /[^\n]*/),
          seq("/**", /[^*]*\*+([^/*][^*]*\*+)*/, "/")
        )
      ),

    contract_defn: ($) =>
      seq(
        spec($),
        "contract",
        field("name", $.ident),
        // field("bases", _o(seq("extends", $.ident_list))),
        // field("interfaces", _o(seq("implements", $.ident_list))),
        field("body", $.contract_body)
      ),

    contract_body: ($) => seq("{", repeat($.contract_item), "}"),
    interface_body: ($) => seq("{", repeat($.interface_item), "}"),

    interface_defn: ($) =>
      seq(
        spec($),
        "interface",
        field("name", $.ident),
        field("bases", _o(seq("extends", $.ident_list))),
        field("body", $.interface_body)
      ),

    _import_stmt: ($) => choice($.import_all, $.import_items),

    import_all: ($) =>
      seq("import", "*", "from", field("filepath", $.string_val)),

    import_items: ($) =>
      seq(
        "import",
        field("symbols", $.import_list),
        "from",
        field("filepath", $.string_val)
      ),

    import_list: ($) =>
      choice(seq("(", csl($.import_item), _o(","), ")"), csl($.import_item)),

    import_item: ($) =>
      seq(field("symbol", $.ident), _o(seq("as", field("alias", $.ident)))),

    error_block: ($) => block("error", $.error_block_item),
    event_block: ($) => block("event", $.event_block_item),
    state_block: ($) => block("state", $.state_block_item),
    exec_block: ($) => block("exec", $.exec_block_item),
    query_block: ($) => block("query", $.query_block_item),

    contract_item: ($) =>
      choice(
        $.error_block,
        $.event_block,
        $.state_block,
        $.exec_block,
        $.query_block,
        $.error_defn,
        $.event_defn,
        $.state_defn,
        $.instantiate_defn,
        $.exec_defn,
        $.query_defn,
        $.migrate_defn,
        $.type_defn
      ),

    interface_item: ($) =>
      choice(
        $.error_block,
        $.event_block,
        $.state_block,
        $.exec_block,
        $.query_block,
        $.error_defn,
        $.event_defn,
        $.state_defn,
        $.instantiate_decl,
        $.exec_decl,
        $.query_decl,
        $.migrate_decl,
        $.type_defn
      ),

    error_block_item: ($) => seq(spec($), $.enum_variant),
    event_block_item: ($) => seq(spec($), $.enum_variant),
    exec_block_item: ($) => seq(spec($), $._named_fn_decl),
    query_block_item: ($) => seq(spec($), $._named_fn_decl),

    error_defn: ($) => seq(spec($), "error", $._enum_variant),
    event_defn: ($) => seq(spec($), "event", $._enum_variant),

    // a bit confusing how there are _state_defn and state_defn..
    // I'm just using this one for the single-state-defn case
    state_defn: ($) => seq(spec($), "state", $._state_defn),
    // I omit the "state" keyword here because it's implied by the block
    // I know this is a bit misleading, but th
    state_block_item: ($) => seq(spec($), $._state_defn),
    _state_defn: ($) => choice($.state_item, $.state_map),
    state_item: ($) =>
      seq(field("key", $.ident), ":", field("type", $.type_expr)),
    state_map: ($) =>
      seq(
        field("key", $.ident),
        field("map_keys", repeat1($.map_key)),
        ":",
        field("type", $.type_expr)
      ),
    map_key: ($) =>
      seq(
        "[",
        _o(seq(field("key_name", $.ident), ":")),
        field("key_type", $.type_expr),
        "]"
      ),

    _named_fn_defn: ($) =>
      seq(
        field("name", $.ident),
        field("args", $.fn_args),
        _o(seq("->", field("return_type", $.type_expr))),
        field("body", $.fn_body)
      ),
    _fn_defn: ($) =>
      seq(
        field("args", $.fn_args),
        _o(seq("->", field("return_type", $.type_expr))),
        field("body", $.fn_body)
      ),
    _named_fn_decl: ($) =>
      seq(
        field("name", $.ident),
        field("args", $.fn_args),
        _o(seq("->", field("return_type", $.type_expr)))
      ),
    _fn_decl: ($) =>
      seq(
        field("args", $.fn_args),
        _o(seq("->", field("return_type", $.type_expr)))
      ),

    instantiate_defn: ($) => seq(spec($), "instantiate", $._fn_defn),
    instantiate_decl: ($) => seq(spec($), "instantiate", $._fn_decl),
    exec_defn: ($) => seq(spec($), "exec", $._named_fn_defn),
    exec_decl: ($) => seq(spec($), "exec", $._named_fn_decl),
    query_defn: ($) => seq(spec($), "query", $._named_fn_defn),
    query_decl: ($) => seq(spec($), "query", $._named_fn_decl),
    migrate_defn: ($) => seq(spec($), "migrate", $._fn_defn),
    migrate_decl: ($) => seq(spec($), "migrate", $._fn_decl),

    fn_args: ($) => seq("(", _o(csl($.fn_arg)), ")"),
    fn_arg: ($) =>
      seq(
        field("name", $.ident),
        field("option", _o("?")),
        ":",
        field("type", $.type_expr)
      ),
    fn_body: ($) => seq("{", repeat($.stmt), "}"),

    stmt: ($) =>
      choice(
        prec(5, $.let_stmt),
        prec(4, $.assign_stmt),
        prec(4, $.if_stmt),
        prec(3, $.for_stmt),
        prec(2, $._directive_stmt),
        $.expr
      ),

    expr: ($) =>
      choice(
        $.grouped_expr,
        $.member_access_expr,
        $.table_lookup_expr,
        $._fn_call_expr,
        $.unary_neg_expr,
        $.unary_not_expr,
        $.mult_div_mod_expr,
        $.add_sub_expr,
        $.comparison_expr,
        $.equality_expr,
        $.and_expr,
        $.or_expr,
        $.query_expr,
        $.val
      ),

    grouped_expr: ($) => prec(100, seq("(", $.expr, ")")),
    member_access_expr: ($) =>
      prec.left(90, seq(field("lhs", $.expr), ".", field("member", $.ident))),
    table_lookup_expr: ($) =>
      prec.left(
        90,
        seq(field("lhs", $.expr), "[", field("index", $.expr), "]")
      ),
    unary_neg_expr: ($) => prec.right(80, seq("-", field("arg", $.expr))),
    unary_not_expr: ($) => prec.right(80, seq("!", field("arg", $.expr))),
    mult_div_mod_expr: ($) =>
      prec.left(
        70,
        seq(
          field("lhs", $.expr),
          field("op", choice("*", "/", "%")),
          field("rhs", $.expr)
        )
      ),
    add_sub_expr: ($) =>
      prec.left(
        60,
        seq(
          field("lhs", $.expr),
          field("op", choice("+", "-")),
          field("rhs", $.expr)
        )
      ),
    comparison_expr: ($) =>
      prec.left(
        50,
        seq(
          field("lhs", $.expr),
          field("op", choice("<", ">", "<=", ">=")),
          field("rhs", $.expr)
        )
      ),
    equality_expr: ($) =>
      prec.left(
        40,
        seq(
          field("lhs", $.expr),
          field("op", choice("==", "!=")),
          field("rhs", $.expr)
        )
      ),
    and_expr: ($) =>
      prec.left(30, seq(field("lhs", $.expr), "and", field("rhs", $.expr))),
    or_expr: ($) =>
      prec.left(20, seq(field("lhs", $.expr), "or", field("rhs", $.expr))),
    query_expr: ($) => prec(10, seq("query", field("arg", $.expr))),

    _fn_call_expr: ($) =>
      choice($.pos_args_fn_call_expr, $.named_args_fn_call_expr),

    pos_args_fn_call_expr: ($) =>
      prec(85, seq(field("function", $.expr), field("args", $.pos_args))),
    pos_args: ($) => prec(85, seq("(", _o(csl($.expr)), ")")),
    named_args_fn_call_expr: ($) =>
      prec(90, seq(field("function", $.expr), field("args", $.named_args))),

    named_args: ($) => prec(90, seq("(", _o(csl($.named_arg)), ")")),
    named_arg: ($) => seq(field("name", $.ident), ":", field("value", $.expr)),

    val: ($) =>
      choice(
        $.unit_val,
        $.struct_val,
        $.tuple_struct_val,
        $.vec_val,
        $.string_val,
        $.integer_val,
        $.decimal_val,
        $._bool_val,
        $.none_val,
        $.ident
      ),

    unit_val: ($) => "()",
    struct_val: ($) =>
      seq(
        field("type", $.type_expr),
        "{",
        _o(field("members_vals", _o(seq(csl($.struct_val_member), _o(","))))),
        "}"
      ),
    struct_val_member: ($) =>
      seq(field("name", $.ident), ":", field("value", $.expr)),
    tuple_struct_val: ($) =>
      seq(
        field("type", $.type_expr),
        "(",
        _o(field("member_vals", csl($.expr))),
        ")"
      ),
    vec_val: ($) => seq("[", _o(field("vals", csl($.expr))), "]"),
    string_val: ($) => /"([^"\r\n\\]|(\\.))*"/,
    integer_val: ($) => /[0-9]+/,
    decimal_val: ($) => /[0-9]+\.[0-9]+/,
    _bool_val: ($) => choice("true", "false"),
    none_val: ($) => "none",

    _bindings: ($) => choice($.ident_binding, $.struct_unpack_binding),
    ident_binding: ($) =>
      seq(field("var_name", $.ident), _o(seq(":", field("type", $.type_expr)))),
    struct_unpack_binding: ($) => seq("{", $.ident_list, "}"),

    let_stmt: ($) =>
      seq("let", field("bindings", $._bindings), "=", field("rhs", $.expr)),
    assign_stmt: ($) =>
      seq(field("lhs", $.expr), field("op", $.assign_op), field("rhs", $.expr)),
    if_stmt: ($) =>
      seq(
        field("if_clause", $.if_clause),
        field("else_if_clauses", repeat($.else_if_clause)),
        field("else_clause", _o($.else_clause))
      ),

    if_clause: ($) =>
      seq("if", field("predicate", $.expr), field("body", $.fn_body)),
    else_if_clause: ($) => seq("else", $.if_clause),
    else_clause: ($) => seq("else", field("body", $.fn_body)),

    for_stmt: ($) =>
      seq(
        "for",
        field("bindings", $._bindings),
        "in",
        field("iterable", $.expr),
        field("body", $.fn_body)
      ),

    _directive_stmt: ($) =>
      choice($.exec_stmt, $.emit_stmt, $.return_stmt, $.fail_stmt),

    exec_stmt: ($) => seq("exec", field("arg", $.expr)),
    emit_stmt: ($) => seq("emit", field("arg", $.expr)),
    return_stmt: ($) => seq("return", field("arg", $.expr)),
    fail_stmt: ($) => seq("fail", field("arg", $.expr)),

    enum_variant: ($) =>
      choice(
        alias($._named_struct, $.named_struct),
        alias($._named_tuple, $.named_tuple)
      ),
    _enum_variant: ($) => choice($._named_struct, $._named_tuple),

    _named_struct: ($) =>
      prec(
        3,
        choice(
          seq(
            field("name", $.ident),
            choice(
              seq(
                "{",
                field("members", _o(seq(csl($.struct_member), _o(",")))),
                "}"
              ),
              seq("(", field("members", csl($.struct_member)), ")")
            )
          )
        )
      ),
    _named_tuple: ($) =>
      prec(
        2,
        seq(
          field("name", $.ident),
          "(",
          field("members", _o(seq(csl($.type_expr)))),
          ")"
        )
      ),

    type_name: ($) => /[A-Z][a-zA-Z0-9_]*/,
    ident: ($) => token(/[a-zA-Z_][a-zA-Z0-9_]*/),

    builtin_type: ($) =>
      choice(
        "bool",
        "i8",
        "i16",
        "i32",
        "i64",
        "i128",
        "u8",
        "u16",
        "u32",
        "u64",
        "u128",
        "byte"
      ),
    assign_op: ($) => choice("=", "+=", "-=", "*=", "/=", "%="),
    directive: ($) => choice("exec", "emit", "return", "fail"),
    ident_list: ($) => csl($.ident),
    struct_member: ($) =>
      seq(
        field("name", $.ident),
        field("is_option", _o("?")),
        ":",
        field("type", $.type_expr)
      ),

    tuple_type: ($) => seq("(", _o(csl($.type_expr)), ")"),
    short_option_type: ($) => prec.left(50, seq($.type_expr, "?")),
    short_vec_type: ($) => prec.left(50, seq($.type_expr, "[]")),
    type_defn: ($) =>
      seq(choice($.struct_defn, $.enum_defn, $.type_alias_defn)),
    struct_defn: ($) => seq(spec($), "struct", $.enum_variant),
    struct_body: ($) => seq("{", _o(seq(csl($.struct_member), _o(","))), "}"),
    enum_defn: ($) =>
      seq(spec($), "enum", field("name", $.ident), field("body", $.enum_body)),
    enum_body: ($) => seq("{", _o(seq(csl($.enum_variant), _o(","))), "}"),
    type_alias_defn: ($) =>
      seq(
        spec($),
        "type",
        field("alias", $.type_name),
        "=",
        field("definition", $.type_expr)
      ),
    infer_type: ($) => "_",

    type_expr: ($) =>
      choice(
        $.type_path,
        $.tuple_type,
        $.short_vec_type,
        $.short_option_type,
        $.type_defn,
        $.infer_type,
        $.builtin_type
      ),
    type_path: ($) =>
      seq(alias($.type_name, $.ident), repeat(seq("::", $.ident))),
  },
});
