export default function(){
return(<form action='https://greenbyphone.com/eCheck/eCheck.aspx' method='post'>
    <table cellPadding='0' cellSpacing='2' >
        <tr>
            <td align='center'>
                <input type='hidden' name='GreenButton_id' value='16578' />
                <input type='hidden' name='Amount' value='22.00' />
                <input type='hidden' name='ItemName' value='Affordable Peptides Order 123456' />
                <input type='hidden' name='TransactionID' value='' />
                <input type='image' src='https://greenbyphone.com/eCheck/images/Paynow2.png' name='submit' alt='' />
                <input type='image' src='https://greenbyphone.com/eCheck/images/spacer.gid'  width='1' height='1' name='submit' alt='' />
            </td>
        </tr>
    </table>
</form>)
}