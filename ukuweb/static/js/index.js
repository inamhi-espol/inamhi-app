$(document).ready(function () {
  $('.dtBasicExample').each(function (index){
    $(this).DataTable();
    $('.dataTables_length').addClass('bs-select');
  })
});
