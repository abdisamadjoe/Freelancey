import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";

// Markup mirrors the original footer (elementor-33744) almost verbatim.
export function SiteFooter() {
  return (
    <footer id="site-footer" className="site-footer footer-position-default">
      <div data-elementor-type="wp-post" data-elementor-id="33744" className="elementor elementor-33744">
        <div className="elementor-element elementor-element-a83789a e-flex e-con-boxed e-con e-parent">
          <div className="e-con-inner">
            <div className="elementor-element elementor-element-60b897d e-con-full e-flex e-con e-child">
              <div className="elementor-element elementor-element-46bcb2e e-con-full e-flex e-con e-child">
                <div className="elementor-element elementor-element-28916e8 e-con-full e-flex e-con e-child">
                  <div className="elementor-element elementor-element-d8f1c9f elementor-widget elementor-widget-heading">
                    <h4 className="elementor-heading-title elementor-size-default">Want to receive news and updates?</h4>
                  </div>
                </div>
                <div className="elementor-element elementor-element-3b4e6ac e-con-full e-flex e-con e-child">
                  <div className="elementor-element elementor-element-40a1634 elementor-widget elementor-widget-keydesign-contact-form7">
                    <div className="kd-widget-container">
                      <NewsletterForm instanceId="f17128-o2" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="elementor-element elementor-element-4b5e922 e-con-full e-flex e-con e-child">
                <div className="elementor-element elementor-element-7e29ee8 e-con-full e-flex e-con e-child">
                  <div className="elementor-element elementor-element-5584a5b elementor-widget elementor-widget-image">
                    <Link href="/">
                      <img width={391} height={87} src="/logo/freelancey.svg" className="attachment-full size-full" alt="Freelancey" />
                    </Link>
                  </div>
                  <div className="elementor-element elementor-element-12273ea elementor-widget elementor-widget-heading">
                    <p className="elementor-heading-title elementor-size-default">Open-source client and project management for freelancers.</p>
                  </div>
                  <div className="elementor-element elementor-element-0ce9041 elementor-widget elementor-widget-keydesign-social-icons">
                    <div className="kd-widget-container">
                      <div className="kd-social-icons elementor-grid" role="list">
                        <span className="kd-social-item elementor-grid-item" role="listitem">
                          <a className="kd-social-icon elementor-icon elementor-animation-float" href="#" target="_blank" rel="nofollow noopener noreferrer" aria-label="Facebook" title="Facebook">
                            <span className="elementor-screen-only">Facebook</span>
                            <i aria-hidden="true" className="kd-icon fab fa-facebook-f" />
                          </a>
                        </span>
                        <span className="kd-social-item elementor-grid-item" role="listitem">
                          <a className="kd-social-icon elementor-icon elementor-animation-float" href="#" target="_blank" rel="nofollow noopener noreferrer" aria-label="X / Twitter" title="X / Twitter">
                            <span className="elementor-screen-only">X / Twitter</span>
                            <i aria-hidden="true" className="kd-icon fab fa-x-twitter" />
                          </a>
                        </span>
                        <span className="kd-social-item elementor-grid-item" role="listitem">
                          <a className="kd-social-icon elementor-icon elementor-animation-float" href="#" target="_blank" rel="nofollow noopener noreferrer" aria-label="Instagram" title="Instagram">
                            <span className="elementor-screen-only">Instagram</span>
                            <i aria-hidden="true" className="kd-icon fab fa-instagram" />
                          </a>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="elementor-element elementor-element-32c5ec2 e-con-full e-flex e-con e-child">
                  <div className="elementor-element elementor-element-42698b1 elementor-widget elementor-widget-heading">
                    <h5 className="elementor-heading-title elementor-size-default">Features</h5>
                  </div>
                  <div className="elementor-element elementor-element-f82592c elementor-widget elementor-widget-icon-list">
                    <ul className="elementor-icon-list-items">
                      <li className="elementor-icon-list-item"><a href="#section1"><span className="elementor-icon-list-text">Invoicing</span></a></li>
                      <li className="elementor-icon-list-item"><a href="#section2"><span className="elementor-icon-list-text">Client portal</span></a></li>
                      <li className="elementor-icon-list-item"><a href="#section3"><span className="elementor-icon-list-text">Projects &amp; tasks</span></a></li>
                      <li className="elementor-icon-list-item"><a href="https://github.com/GroundworkTechnologies/Freelancey" target="_blank" rel="noreferrer"><span className="elementor-icon-list-text">Open source</span></a></li>
                    </ul>
                  </div>
                </div>
                <div className="elementor-element elementor-element-8b7e723 e-con-full e-flex e-con e-child">
                  <div className="elementor-element elementor-element-a2db79a elementor-widget elementor-widget-heading">
                    <h5 className="elementor-heading-title elementor-size-default">Resources</h5>
                  </div>
                  <div className="elementor-element elementor-element-5a5ffa7 elementor-widget elementor-widget-icon-list">
                    <ul className="elementor-icon-list-items">
                      <li className="elementor-icon-list-item"><a href="https://github.com/GroundworkTechnologies/Freelancey/issues" target="_blank" rel="noreferrer"><span className="elementor-icon-list-text">Support center</span></a></li>
                      <li className="elementor-icon-list-item"><a href="https://github.com/GroundworkTechnologies/Freelancey#readme" target="_blank" rel="noreferrer"><span className="elementor-icon-list-text">Documentation</span></a></li>
                      <li className="elementor-icon-list-item"><a href="https://github.com/GroundworkTechnologies/Freelancey" target="_blank" rel="noreferrer"><span className="elementor-icon-list-text">Community</span></a></li>
                      <li className="elementor-icon-list-item"><a href="https://github.com/GroundworkTechnologies/Freelancey/blob/main/docs/Everything-You-Need-To-Know.md" target="_blank" rel="noreferrer"><span className="elementor-icon-list-text">Hosting</span></a></li>
                    </ul>
                  </div>
                </div>
                <div className="elementor-element elementor-element-29c362d e-con-full e-flex e-con e-child">
                  <div className="elementor-element elementor-element-1087b68 elementor-widget elementor-widget-heading">
                    <h5 className="elementor-heading-title elementor-size-default">Company</h5>
                  </div>
                  <div className="elementor-element elementor-element-9f64625 elementor-widget elementor-widget-icon-list">
                    <ul className="elementor-icon-list-items">
                      <li className="elementor-icon-list-item"><a href="#"><span className="elementor-icon-list-text">About us</span></a></li>
                      <li className="elementor-icon-list-item"><a href="#"><span className="elementor-icon-list-text">Blog</span></a></li>
                      <li className="elementor-icon-list-item"><a href="#"><span className="elementor-icon-list-text">Contact us</span></a></li>
                      <li className="elementor-icon-list-item"><a href="#"><span className="elementor-icon-list-text">Resources</span></a></li>
                    </ul>
                  </div>
                </div>
                <div className="elementor-element elementor-element-e1a3755 e-con-full e-flex e-con e-child">
                  <div className="elementor-element elementor-element-c9d774e elementor-widget elementor-widget-heading">
                    <h5 className="elementor-heading-title elementor-size-default">Social</h5>
                  </div>
                  <div className="elementor-element elementor-element-4c8eae4 elementor-widget elementor-widget-icon-list">
                    <ul className="elementor-icon-list-items">
                      <li className="elementor-icon-list-item"><a href="https://github.com/GroundworkTechnologies/Freelancey" target="_blank" rel="noreferrer"><span className="elementor-icon-list-text">GitHub</span></a></li>
                      <li className="elementor-icon-list-item"><a href="#"><span className="elementor-icon-list-text">X / Twitter</span></a></li>
                      <li className="elementor-icon-list-item"><a href="#"><span className="elementor-icon-list-text">Facebook</span></a></li>
                      <li className="elementor-icon-list-item"><a href="#"><span className="elementor-icon-list-text">Instagram</span></a></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="elementor-element elementor-element-a8ba9fd e-con-full e-flex e-con e-child">
                <div className="elementor-element elementor-element-a8f6458 e-con-full e-flex e-con e-child">
                  <div className="elementor-element elementor-element-1566f81 elementor-widget elementor-widget-text-editor">
                    © Freelancey. All rights reserved.
                  </div>
                </div>
                <div className="elementor-element elementor-element-663341f e-con-full e-flex e-con e-child">
                  <div className="elementor-element elementor-element-77c7963 elementor-widget elementor-widget-icon-list">
                    <ul className="elementor-icon-list-items elementor-inline-items">
                      <li className="elementor-icon-list-item elementor-inline-item"><a href="/terms-and-conditions"><span className="elementor-icon-list-text">Terms &amp; Conditions</span></a></li>
                      <li className="elementor-icon-list-item elementor-inline-item"><a href="#"><span className="elementor-icon-list-text">Privacy Policy</span></a></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
