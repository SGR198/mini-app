const staffHost=()=>document.getElementById("staff-cost-workspace");
const balanceHost=()=>document.getElementById("balance-workspace");

export const balancePage={
  code:"balance",
  name:"Баланс",
  async activate(){
    const staff=staffHost();
    const balance=balanceHost();
    if(staff) staff.hidden=true;
    if(balance){
      balance.hidden=false;
      balance.innerHTML=`<section class="balance-placeholder-card">
        <div class="balance-placeholder-kicker">Рабочая область</div>
        <h1>Баланс</h1>
        <p>Страница подключена к Mini App. Данные и экраны Balance будут перенесены следующим этапом.</p>
      </section>`;
    }
  },
  deactivate(){
    const balance=balanceHost();
    if(balance) balance.hidden=true;
  }
};
