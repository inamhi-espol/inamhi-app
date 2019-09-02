# -*- coding: utf-8 -*-
from ukuweb import settings
import requests
import ast
import csv
from .models import FormData
import xlsxwriter
import io
from ukuweb.settings import FORMS_ROOT


def send_file_to_ckan(file, name, set_id):
    url = "http://{0}/api/3/action/resource_create".format(settings.HOST)
    body = {"package_id": set_id, "name": name}
    headers = {"Authorization": settings.API_KEY}
    r = requests.post(url, headers=headers, files=[("upload", file)], data=body)
    return r.json()


def update_file_in_ckan(file, resource_id):
    url = "http://{0}/api/3/action/resource_update".format(settings.HOST)
    body = {"id": resource_id}
    headers = {"Authorization": settings.API_KEY}
    r = requests.post(url, headers=headers, files=[("upload", file)], data=body)
    return r.json()


def convert_to_csv_and_send_to_ckan(data, filename, set_id):
    labels = get_labels_from_form(data)
    cols = get_values_from_form(data)
    file = convert_to_csv(labels, cols, filename)
    file = open("{0}/{1}.csv".format(FORMS_ROOT, filename), "rb")
    resp = send_file_to_ckan(file, filename, set_id)
    file.close()
    return resp


def get_templates_from_ckan(api_key, set_id="0cfc0e05-8e4c-435a-893b-5d12ede68f0f"):
    url = "http://{0}/api/3/action/package_show?id={1}".format(settings.HOST, set_id)
    header = {"content-type": "application/json", "Authorization": settings.API_KEY}
    resp = requests.get(url, headers=header)
    templates = []
    if resp.status_code == 200 or resp.status_code == 201:
        results = resp.json()["result"]
        if results.get("num_resources", 0) > 0:
            for resource in results.get("resources"):
                resp = requests.get(resource["url"], headers=header)
                templates.append(resp.json())
            return templates
        else:
            return templates
    return None


def get_set_id(name):
    url = "http://{0}/api/3/action/package_search?q={1}".format(settings.HOST, name)
    header = {"content-type": "application/json", "Authorization": settings.API_KEY}
    resp = requests.get(url, headers=header)
    if resp.status_code == 200 or resp.status_code == 201:
        results = resp.json()["result"]
        if results.get("count", 0) > 0:
            set_id = results.get("results")[0]["id"]
            return set_id
    return None


def get_labels_from_form_to_xls(obj):
    objects = []
    for i in obj:
        is_key = type(obj) is dict and type(i) is not dict and type(i) is not list
        is_dict = type(i) is dict
        if is_key:
            next_value_is_dict = type(obj[i]) is dict or type(obj[i]) is list
            if next_value_is_dict:
                objects = objects + get_labels_from_form_to_xls(obj[i])
        elif is_dict:
            has_key = i.get("label", None) is not None
            has_key_and_value = (
                (i.get("label", None) is not None and i.get("value", None) is not None)
                or (
                    i.get("label", None) is not None
                    and i.get("checked", None) is not None
                )
                or (
                    i.get("label2", None) is not None
                    and i.get("checked", None) is not None
                )
            )
            is_table = i.get("type", None) and i.get("type").startswith("table")
            if is_table:
                continue
            elif has_key and i.get("type", None) == "checkbox_input":
                objects.append(
                    {
                        "label": i["label"].encode("utf-8").decode("string_escape"),
                        "type": "title",
                        "width": len(i.get("children")),
                    }
                )
                objects = objects + get_labels_from_form_to_xls(i)

            elif has_key_and_value:
                key = "label" if i.get("label", None) else "label2"
                objects.append(
                    {
                        "label": i[key].encode("utf-8").decode("string_escape"),
                        "type": "subtitle",
                    }
                )
            else:
                objects = objects + get_labels_from_form_to_xls(i)
    return objects


def get_labels_from_form(obj):
    objects = []
    for i in obj:
        is_key = type(obj) is dict and type(i) is not dict and type(i) is not list
        is_dict = type(i) is dict
        if is_key:
            next_value_is_dict = type(obj[i]) is dict or type(obj[i]) is list
            if next_value_is_dict:
                objects = objects + get_labels_from_form(obj[i])
        elif is_dict:
            has_key_and_value = (
                (i.get("label", None) is not None and i.get("value", None) is not None)
                or (
                    i.get("label", None) is not None
                    and i.get("checked", None) is not None
                )
                or (
                    i.get("label2", None) is not None
                    and i.get("checked", None) is not None
                )
            )
            is_table = i.get("type", None) and i.get("type").startswith("table")
            if is_table:
                continue
            elif has_key_and_value:
                key = "label" if i.get("label", None) else "label2"
                objects.append(i[key].encode("utf-8").decode("string_escape"))
            else:
                objects = objects + get_labels_from_form(i)
    return objects


def get_tables_from_form(obj):
    objects = []
    for i in obj:
        is_key = type(obj) is dict and type(i) is not dict and type(i) is not list
        is_dict = type(i) is dict
        if is_key:
            next_value_is_dict = type(obj[i]) is dict or type(obj[i]) is list
            if next_value_is_dict:
                objects = objects + get_tables_from_form(obj[i])
        elif is_dict:
            label = i.get("label", None) is not None
            is_table = (
                i.get("type", None) is not None
                and i["type"].startswith("table")
                and i.get("children", None)
                and i.get("selects") is None
                and label
            )
            if is_table:
                objects.append(i)
            else:
                objects = objects + get_tables_from_form(i)
    return objects


def convert_table_to_xls(
    worksheet,
    title,
    vertical_labels,
    horizontal_labels,
    values,
    title_format,
    value_format,
):
    worksheet.write(0, 0, title, title_format)
    worksheet.merge_range(0, 0, 0, len(horizontal_labels), title, title_format)
    col = 1
    for horizontal_label in horizontal_labels:
        worksheet.write(1, col, horizontal_label, title_format)
        col += 1
    row = 2
    for vertical_label in vertical_labels:
        worksheet.write(row, 0, vertical_label, title_format)
        row += 1

    col = 1
    row = 2
    for h_values in values:
        for val in h_values:
            worksheet.write(row, col, val, value_format)
            col += 1
        row += 1
        col = 1


def get_tables_info_for_xls(tables):
    titles = []
    vertical = []
    horizontal = []
    values = []
    num_tables = 1
    for table in tables:
        titles.append(table["label"])
        horizontal_labels = []
        vertical_labels = []
        value_list = []
        for i in range(1, len(table.keys()) + 1):
            if "placeholder_" + str(i) in table.keys():
                label = table["placeholder_" + str(i)]
                horizontal_labels.append(label)

        for child in table.get("children"):
            if not "label" in child.keys():
                break
            vertical_labels.append(child["label"])
            rows = []

            for j in range(1, len(child.keys()) + 1):
                if "text" + str(j) in child.keys():
                    rows.append(child["text" + str(j)])
            if "value" in child.keys() and type(child["value"]) is not bool:
                rows.append(child["value"])

            if len(rows) > 0:
                value_list.append(rows)
        if (
            len(horizontal_labels) > 0
            and len(value_list) > 0
            and len(vertical_labels) > 0
        ):

            horizontal.append(horizontal_labels)
            values.append(value_list)
            vertical.append(vertical_labels)
            num_tables += 1
        else:
            titles.pop()
    return [titles, vertical, horizontal, values]


def get_values_from_form(obj):
    values = []
    for i in obj:
        is_key = type(obj) is dict and type(i) is not dict and type(i) is not list
        is_dict = type(i) is dict
        if is_key:
            next_value_is_dict = type(obj[i]) is dict or type(obj[i]) is list
            if next_value_is_dict:
                values = values + get_values_from_form(obj[i])
        elif is_dict:
            has_key_and_value = (
                i.get("label", None) is not None and i.get("value", None) is not None
            )
            has_key_and_checked = (
                i.get("label", None) is not None and i.get("checked", None) is not None
            )
            has_label2_and_checked = (
                i.get("label2", None) is not None and i.get("checked", None) is not None
            )
            is_table = i.get("type", None) and i.get("type").startswith("table")
            if is_table:
                continue
            if has_key_and_value:
                values.append(i["value"].encode("utf-8").decode("string_escape"))
            elif has_key_and_checked:
                value = (
                    i["checked"].encode("utf-8").decode("string_escape")
                    if (not type(i["checked"]) is bool)
                    else i["checked"]
                )
                values.append(value)
            elif has_label2_and_checked:
                value = (
                    i["checked"].encode("utf-8").decode("string_escape")
                    if (not type(i["checked"]) is bool)
                    else i["checked"]
                )
                values.append(value)
            else:
                values = values + get_values_from_form(i)
    return values


def convert_form_to_excel(form, filename):
    data = ast.literal_eval(form.data)
    labels = get_labels_from_form_to_xls(data)
    cols = get_values_from_form(data)
    tables = get_tables_from_form(data)
    tables_info = get_tables_info_for_xls(tables)
    return convert_to_xls(labels, [cols], filename, True, tables_info)


def convert_data_into_head_body(objs):
    body = []
    head = get_labels_from_form(objs[0])
    for obj in objs:
        body.append(get_values_from_form(obj))
    return (head, body)


def get_label_values_objects(objs):
    rows = []
    labels = []
    for obj in objs:
        labels = labels + get_labels_from_form(objs[0])
        rows.append(get_values_from_form(obj))
    return (labels, rows)


def convert_to_xls(head_list, body_list, title, include_tables, table_info):
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    format = workbook.add_format({"bold": True, "text_wrap": True, "valign": "top"})
    worksheet = workbook.add_worksheet()

    col = 0
    for head_dict in head_list:
        label = head_dict["label"].decode("utf-8")
        label_type = head_dict["type"]
        if label_type == "subtitle":
            worksheet.write(1, col, label, format)
            col += 1
        else:
            worksheet.merge_range(
                0, col, 0, col + head_dict["width"] - 1, label, format
            )
    row = 2
    col = 0

    for value_list in body_list:
        for value in value_list:
            text_format = workbook.add_format({"text_wrap": 1, "valign": "top"})
            if type(value) == bool:
                value = "Verdadero" if value else "Falso"
                worksheet.write(row, col, value, text_format)
                col += 1
            else:
                worksheet.write(row, col, value.decode("utf-8"), text_format)
                col += 1
        col = 0
        row += 1
    if include_tables:
        titles = table_info[0]
        vertical_labels = table_info[1]
        horizontal_labels = table_info[2]
        values = table_info[3]
        num = 1
        title_format = workbook.add_format(
            {"bold": True, "text_wrap": True, "valign": "top", "border": 1}
        )
        value_format = workbook.add_format(
            {"text_wrap": True, "valign": "top", "border": 1}
        )
        for i in range(len(titles)):
            title = titles[i]
            worksheet = workbook.add_worksheet("tabla" + str(num))
            convert_table_to_xls(
                worksheet,
                title,
                vertical_labels[i],
                horizontal_labels[i],
                values[i],
                title_format,
                value_format,
            )
            num += 1
    workbook.close()
    output.seek(0)
    return output


def convert_to_csv(fieldnames, cols, title):
    with open("{0}/{1}.csv".format(FORMS_ROOT, title), mode="wb") as file:
        writer = csv.writer(
            file, delimiter=",", quotechar='"', quoting=csv.QUOTE_MINIMAL
        )
        writer.writerow(fieldnames)
        writer.writerow(cols)
